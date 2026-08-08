// src/lib/provisiond.ts
//
// Client du démon de provisioning (mania-provisiond), via SOCKET UNIX.
// Le socket est monté dans le conteneur (voir docker-compose). Le secret
// (PROVISIOND_SECRET) reste CÔTÉ SERVEUR — jamais exposé au navigateur.
//
// À n'importer QUE depuis du code serveur (routes API), jamais côté client.

import http from 'node:http'

const SOCKET_PATH =
  process.env.PROVISIOND_SOCKET || '/run/mania-provisiond/provisiond.sock'

export type DaemonResponse<T = unknown> = { status: number; body: T }

function call<T = unknown>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<DaemonResponse<T>> {
  return new Promise((resolve, reject) => {
    const secret = process.env.PROVISIOND_SECRET
    if (!secret) {
      reject(new Error('PROVISIOND_SECRET non configuré côté serveur'))
      return
    }

    const data = body !== undefined ? JSON.stringify(body) : undefined
    const req = http.request(
      {
        socketPath: SOCKET_PATH,
        path,
        method,
        timeout: 15_000, // chaque appel au démon est court (démarrage / sondage)
        headers: {
          Authorization: `Bearer ${secret}`,
          ...(data
            ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
              }
            : {}),
        },
      },
      (res) => {
        let chunks = ''
        res.on('data', (c) => (chunks += c))
        res.on('end', () => {
          let parsed: unknown = null
          try {
            parsed = chunks ? JSON.parse(chunks) : null
          } catch {
            parsed = { raw: chunks }
          }
          resolve({ status: res.statusCode ?? 0, body: parsed as T })
        })
      },
    )
    req.on('error', reject)
    req.on('timeout', () => req.destroy(new Error('délai dépassé (démon injoignable)')))
    if (data) req.write(data)
    req.end()
  })
}

// --- Démarrage d'un provisioning : renvoie { job_id, status } ---------------
export function provisionStart(input: {
  slug: string
  name: string
  sector?: string
  agentName?: string
  ownerEmail: string
  pack?: string
  // ÉLÈVE le niveau, ne l'abaisse jamais : un secteur qui déclare PII=1 le
  // reste, `pii: false` ou non. Il n'existe volontairement aucun moyen de
  // désactiver la pseudonymisation depuis le web — voir services/gabarit/packs.
  pii?: boolean
}) {
  return call<{ job_id?: string; status?: string; slug?: string; detail?: string }>(
    'POST',
    '/v1/provision',
    {
      slug: input.slug,
      name: input.name,
      sector: input.sector,
      agent_name: input.agentName,
      owner_email: input.ownerEmail,
      pack: input.pack,
      pii: input.pii,
    },
  )
}

// --- Démarrage d'un dé-provisionnement (confirm imposé) ---------------------
export function deprovisionStart(slug: string) {
  return call<{ job_id?: string; status?: string; slug?: string; detail?: string }>(
    'POST',
    '/v1/deprovision',
    { slug, confirm: true },
  )
}

// --- État d'un job ----------------------------------------------------------
export type JobResult = {
  slug?: string
  url?: string
  webui_password?: string
  basicauth_user?: string
  basicauth_password?: string
  route_status?: string
  agent_health?: string
  returncode?: number
  log?: string
}
export type JobState = {
  id: string
  type: 'provision' | 'deprovision'
  slug: string
  status: 'running' | 'done' | 'error'
  result: JobResult | null
  error: string | null
  detail?: string
}

export function jobStatus(jobId: string) {
  return call<JobState>('GET', `/v1/jobs/${encodeURIComponent(jobId)}`)
}
