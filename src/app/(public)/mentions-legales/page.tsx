// src/app/(public)/mentions-legales/page.tsx
//
// Mentions légales — gabarit « page juridique » (.read + .legal-*), partagé
// avec la politique de confidentialité et les articles de blog.
//
// ⚠️ Volontairement SANS numéro d'immatriculation ni mention fiscale (NINEA) :
//    le statut de MANIA n'est pas encore arrêté (cf. STACK-2 §32). Le jour où
//    il l'est, ajouter une ligne dans « Éditeur du site ».

import Link from 'next/link'

export const metadata = {
  title: 'Mentions légales — MANIA',
  description: 'Mentions légales du site mania.sn : éditeur, hébergement, propriété intellectuelle et données personnelles.',
}

export default function MentionsLegalesPage() {
  return (
    <article className="read">
      <p className="legal-updated">Dernière mise à jour : 31 juillet 2026</p>
      <h1 className="legal-title">Mentions légales</h1>

      <nav className="legal-toc" aria-label="Sommaire">
        <h2>Sommaire</h2>
        <ol>
          <li><a href="#editeur">Éditeur du site</a></li>
          <li><a href="#publication">Directeur de la publication</a></li>
          <li><a href="#hebergement">Hébergement</a></li>
          <li><a href="#propriete">Propriété intellectuelle</a></li>
          <li><a href="#donnees">Données personnelles</a></li>
          <li><a href="#contact">Contact</a></li>
        </ol>
      </nav>

      <section className="legal-sec" id="editeur">
        <h2><span className="num">01</span>Éditeur du site</h2>
        <p>
          Le présent site est édité par <strong>MANIA</strong>, plateforme proposant
          des agents IA personnels configurés par métier et des formations aux
          bonnes pratiques des modèles de langage.
        </p>
        <p>
          Siège : Dakar, Sénégal.<br />
          Contact : <a href="mailto:contact@mania.sn">contact@mania.sn</a>
        </p>
      </section>

      <section className="legal-sec" id="publication">
        <h2><span className="num">02</span>Directeur de la publication</h2>
        <p>
          Le directeur de la publication est le représentant légal de MANIA.
          Toute demande relative au contenu éditorial du site peut être adressée
          par courrier électronique à l&apos;adresse de contact indiquée ci-dessus.
        </p>
      </section>

      <section className="legal-sec" id="hebergement">
        <h2><span className="num">03</span>Hébergement</h2>
        <p>
          Le site et les espaces clients hébergés sont installés sur des serveurs
          opérés par <strong>OVH</strong> (OVH SAS, 2 rue Kellermann, 59100 Roubaix,
          France), <strong>physiquement situés au Canada</strong>. Les données
          applicatives sont traitées conformément à la <strong>loi n°2008-12</strong> du
          25 janvier 2008 portant sur la protection des données à caractère personnel au
          Sénégal. Les clients qui souhaitent que leurs données ne quittent pas leurs
          locaux disposent d&apos;une installation sur leur propre infrastructure.
        </p>
      </section>

      <section className="legal-sec" id="propriete">
        <h2><span className="num">04</span>Propriété intellectuelle</h2>
        <p>
          L&apos;ensemble des éléments composant le site — textes, mise en page,
          identité visuelle, logo, illustrations et code — est la propriété
          exclusive de MANIA, sauf mention contraire. Toute reproduction,
          représentation ou diffusion, totale ou partielle, sans autorisation
          écrite préalable est interdite.
        </p>
        <p>
          Les marques et logos de tiers éventuellement cités demeurent la
          propriété de leurs détenteurs respectifs.
        </p>
      </section>

      <section className="legal-sec" id="donnees">
        <h2><span className="num">05</span>Données personnelles</h2>
        <p>
          MANIA collecte et traite certaines données personnelles dans le cadre
          de la fourniture de ses services (compte, candidature, formation).
          Les modalités de collecte, de conservation et d&apos;exercice de vos droits
          sont décrites dans notre{' '}
          <Link href="/confidentialite">politique de confidentialité</Link>.
        </p>
        <p>
          Vous disposez d&apos;un droit d&apos;accès, de rectification et de suppression
          de vos données, exerçable à tout moment via l&apos;adresse de contact.
        </p>
      </section>

      <section className="legal-sec" id="contact">
        <h2><span className="num">06</span>Contact</h2>
        <p>
          Pour toute question relative aux présentes mentions légales ou au
          fonctionnement du site, écrivez-nous à{' '}
          <a href="mailto:contact@mania.sn">contact@mania.sn</a>.
          Nous nous efforçons de répondre sous quelques jours ouvrés.
        </p>
      </section>
    </article>
  )
}
