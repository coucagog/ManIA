// src/app/(public)/agent-ia/page.tsx
//
// PAGE PRODUIT des agents IA (STACK-5 §50). Composant SERVEUR : aucun état,
// tout vient de src/lib/offres.ts — source unique.
//
// ℹ️ C'est la destination de l'onglet « Agent IA » de la nav. Avant, cet
//    onglet pointait droit sur /candidature : le visiteur qui voulait
//    comprendre l'offre tombait sur un formulaire lui demandant son nom.
//    La candidature est désormais l'ÉTAPE SUIVANTE, atteinte depuis ici.
//
// ⚠️ Ne JAMAIS recopier un prix ou un libellé de palier ici : la page doit
//    rester un rendu de `OFFRES`. C'est la leçon du §26 (STACK-2), où une
//    liste dupliquée à trois endroits a désynchronisé deux fois.
//
// ⚠️ Rappel JSX : `//` n'est pas un commentaire, c'est du texte affiché (§23).

import Link from 'next/link'
import {
  OFFRES,
  PROMO_LANCEMENT,
  RECHARGES,
  MOIS_PAYES_PAR_AN,
  prixFcfa,
} from '@/lib/offres'

export const metadata = {
  title: 'Agents IA — offres et tarifs — MANIA',
  description:
    "Les offres MANIA : agent IA hébergé avec crédit d'IA inclus, ou stack locale sur votre propre infrastructure. Tarifs en FCFA, mise en service accompagnée.",
}

export default function OffresPage() {
  return (
    <>
      {/* ===== EN-TÊTE ===== */}
      <section className="land-section">
        <p className="land-eyebrow">Agents IA · Offres &amp; tarifs</p>
        <h1 className="off-h1">Un agent configuré pour votre métier, à un prix lisible.</h1>
        <p className="off-lead">
          Deux façons de travailler avec nous : un agent <strong>hébergé</strong>{' '}
          par MANIA, abonnement tout compris avec le crédit d&apos;IA inclus — ou une{' '}
          <strong>stack locale</strong> installée sur votre propre matériel, quand vous
          voulez que rien ne sorte de chez vous.
        </p>

        {PROMO_LANCEMENT.actif && (
          <div className="off-promo">
            <span className="off-promo-tag">{PROMO_LANCEMENT.titre}</span>
            <p>
              {PROMO_LANCEMENT.texte}{' '}
              <span className="off-promo-note">
                Il s&apos;agit d&apos;un nombre de places réel, pas d&apos;un artifice :
                chaque agent est configuré à la main.
              </span>
            </p>
          </div>
        )}
      </section>

      {/* ===== LES PALIERS ===== */}
      <section className="land-section">
        <div className="off-grid">
          {OFFRES.map(o => {
            const surDevis = o.prixMensuel === null
            return (
              <article
                className={`off-card${o.miseEnAvant ? ' off-card--fort' : ''}`}
                key={o.code}
              >
                <span
                  className={`off-accent${o.secretPro ? ' off-accent--fg' : ' off-accent--coral'}`}
                  aria-hidden="true"
                />

                {/* Le libellé est RÉSERVÉ sur toutes les cartes et visible sur
                    une seule : sinon la carte mise en avant décalerait son
                    titre et son prix, et la grille perdrait ses lignes de
                    comparaison horizontales — tout l'intérêt d'une page de
                    tarifs. */}
                <p className={`off-tag${o.miseEnAvant ? ' off-tag--on' : ''}`}>
                  {o.miseEnAvant ? 'Le plus choisi' : ' '}
                </p>

                <p className="off-cible">{o.cible}</p>
                <h2 className="off-nom">{o.nom}</h2>

                <div className="off-prix">
                  {surDevis ? (
                    <span className="off-devis">Sur devis</span>
                  ) : (
                    <>
                      <span className="off-prix-num">{prixFcfa(o.prixMensuel!)}</span>
                      <span className="off-prix-u">par mois</span>
                    </>
                  )}
                </div>

                <p className="off-mes">
                  {o.miseEnService === null ? (
                    <>Mise en service chiffrée avec vous</>
                  ) : (
                    <>
                      Mise en service{' '}
                      <span className="off-mes-barre">{prixFcfa(o.miseEnService)}</span>{' '}
                      {PROMO_LANCEMENT.actif && <strong className="off-mes-promo">offerte</strong>}
                    </>
                  )}
                </p>

                <p className="off-llm">
                  <span className="off-llm-lbl">Modèle d&apos;IA</span>
                  {o.llm}
                </p>

                <ul className="off-specs">
                  <li>{o.personnes}</li>
                  <li>{o.profils}</li>
                  <li>{o.hebergement}</li>
                </ul>

                <ul className="off-points">
                  {o.points.map(p => (
                    <li key={p}><span aria-hidden="true">·</span> {p}</li>
                  ))}
                </ul>

                {o.secretPro && (
                  <p className="off-badge-sp">
                    Ouvert aux métiers à secret professionnel
                  </p>
                )}

                <Link
                  href={`/candidature?offre=${o.code}`}
                  className={`${surDevis ? 'btn-soft-sm' : 'btn-cta-sm'} off-btn`}
                >
                  {surDevis ? 'Demander un devis →' : 'Choisir cette offre →'}
                </Link>
              </article>
            )
          })}
        </div>

        <p className="off-annuel">
          Engagement annuel : <strong>{MOIS_PAYES_PAR_AN} mois payés</strong> au lieu de 12.
          Les tarifs sont indiqués hors taxes applicables.
        </p>
      </section>

      {/* ===== LE CRÉDIT D'IA, EN CLAIR ===== */}
      <section className="land-section">
        <p className="land-eyebrow">Sans mauvaise surprise</p>
        <h2 className="land-h2">Le crédit d&apos;IA, en clair</h2>
        <p className="off-lead off-lead--tight">
          Faire fonctionner un agent consomme de l&apos;intelligence artificielle, et cela a
          un coût réel. Plutôt que de vous demander d&apos;ouvrir un compte chez un
          fournisseur étranger avec une carte bancaire internationale, nous incluons ce
          crédit dans l&apos;abonnement.
        </p>

        <div className="off-credit">
          <div className="off-credit-col">
            <h3>Inclus chaque mois</h3>
            <p>
              Une enveloppe d&apos;usage dimensionnée pour votre palier. Vous n&apos;avez
              aucun abonnement d&apos;IA à souscrire, aucune clé à obtenir, aucune carte à
              fournir.
            </p>
          </div>
          <div className="off-credit-col">
            <h3>Si l&apos;enveloppe est épuisée</h3>
            <p>
              L&apos;agent s&apos;arrête et vous prévient. Nous ne basculons{' '}
              <strong>jamais</strong> en silence vers un modèle moins performant : vous
              sauriez que quelque chose a changé sans savoir quoi.
            </p>
          </div>
          <div className="off-credit-col">
            <h3>Recharger</h3>
            <p>
              À tout moment, par recharge :{' '}
              {RECHARGES.map(r => prixFcfa(r)).join(' · ')}. Le crédit non consommé
              d&apos;un mois ne se reporte pas.
            </p>
          </div>
        </div>

        <p className="off-note">
          Vous avez déjà votre propre abonnement d&apos;IA et souhaitez l&apos;utiliser ?
          C&apos;est possible — dites-le dans votre demande, nous adaptons.
        </p>
      </section>

      {/* ===== CE QUE TOUS LES PALIERS PARTAGENT ===== */}
      <section className="land-section">
        <div className="land-trust">
          <p className="land-eyebrow">Dans toutes les offres</p>
          <h2 className="land-trust-h2">Ce que vous obtenez, quel que soit le palier</h2>
          <div className="land-trust-cols">
            <div>
              <h3>Un espace isolé</h3>
              <p>
                Chaque client dispose de son propre espace cloisonné. Aucune donnée
                n&apos;est partagée entre clients.
              </p>
            </div>
            <div>
              <h3>Sauvegarde chiffrée</h3>
              <p>
                Sauvegarde quotidienne, chiffrée avant tout envoi : l&apos;hébergeur de
                sauvegarde ne détient jamais que des données illisibles pour lui.
              </p>
            </div>
            <div>
              <h3>Mise en service accompagnée</h3>
              <p>
                Nous configurons l&apos;agent avec vous — ce n&apos;est pas du
                libre-service. Un interlocuteur reste joignable ensuite.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== OÙ VIVENT VOS DONNÉES ===== */}
      <section className="land-section">
        <p className="land-eyebrow">Où vivent vos données</p>
        <h2 className="land-h2">Nous préférons être précis qu&apos;impressionnants</h2>

        <div className="off-donnees">
          <div className="off-donnees-col">
            <h3>Offres hébergées</h3>
            <p>
              Vos données sont traitées sur des serveurs <strong>OVH</strong>, opérés au
              Canada, dans un espace isolé qui vous est propre. Elles ne sont ni revendues
              ni transmises à des tiers. Le traitement suit la{' '}
              <strong>loi n°2008-12</strong> relative aux données à caractère personnel au
              Sénégal.
            </p>
          </div>
          <div className="off-donnees-col off-donnees-col--fort">
            <h3>Stack locale</h3>
            <p>
              Le modèle d&apos;IA tourne <strong>sur votre machine</strong> :{' '}
              <strong>vos contenus ne sont jamais envoyés à un fournisseur d&apos;IA</strong>.
              Selon vos volumes, un poste dédié avec onduleur, ou un serveur équipé
              d&apos;une carte graphique de calcul. Le modèle ouvert est choisi avec vous
              en fonction de votre matériel.
            </p>
          </div>
        </div>
      </section>

      {/* ===== QUESTIONS ===== */}
      <section className="land-section">
        <p className="land-eyebrow">Questions fréquentes</p>
        <h2 className="land-h2">Ce qu&apos;on nous demande avant de signer</h2>

        <div className="off-faq">
          <details className="off-q">
            <summary>Je suis médecin, avocat, banquier — puis-je souscrire ?</summary>
            <p>
              Sur les offres hébergées, <strong>pas encore</strong>, et nous préférons vous
              le dire plutôt que de vous laisser le découvrir. Les données couvertes par le
              secret professionnel demandent un dispositif de protection supplémentaire, en
              cours de construction. En revanche, la <strong>stack locale</strong>{' '}
              vous est ouverte dès aujourd&apos;hui : rien ne quitte votre infrastructure.
            </p>
          </details>

          <details className="off-q">
            <summary>Pourquoi une mise en service payante ?</summary>
            <p>
              Parce qu&apos;un agent générique ne vaut pas grand-chose. Ce que vous payez,
              c&apos;est le temps passé à comprendre votre métier, votre vocabulaire et vos
              procédures, puis à les inscrire dans l&apos;agent. C&apos;est ce travail qui
              fait la différence entre votre agent et un assistant grand public.
            </p>
          </details>

          <details className="off-q">
            <summary>Puis-je changer de palier en cours de route ?</summary>
            <p>
              Oui, dans les deux sens, d&apos;un mois sur l&apos;autre. Passer d&apos;un
              palier hébergé à la stack locale demande en revanche une installation sur
              site : nous en parlons avant.
            </p>
          </details>

          <details className="off-q">
            <summary>Que se passe-t-il si j&apos;arrête ?</summary>
            <p>
              Vos données vous sont restituées et votre espace est supprimé. Nous ne
              conservons rien au-delà de ce que la loi impose. En cas d&apos;impayé, votre
              espace est <strong>suspendu</strong>, pas effacé — vous ne perdez pas votre
              travail pour une facture en retard.
            </p>
          </details>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="land-section">
        <div className="land-cta">
          <h2>Une question avant de choisir ?</h2>
          <p>
            Décrivez votre activité et le palier qui vous semble adapté. Nous étudions
            chaque demande et revenons vers vous par e-mail — si une autre offre vous
            convient mieux, nous vous le dirons.
          </p>
          <div className="land-cta-actions">
            <Link href="/candidature" className="btn-cta-sm">Demander un agent →</Link>
            <Link href="/formation" className="btn-soft-sm">Découvrir la formation</Link>
          </div>
        </div>
      </section>
    </>
  )
}
