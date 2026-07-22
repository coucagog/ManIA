// src/app/(public)/confidentialite/page.tsx
//
// ⚠️ Cette page n'est pas optionnelle : la case de consentement du formulaire
//    de candidature pointe dessus. Sans elle, la collecte n'est pas conforme
//    à la loi n°2008-12 dès la mise en ligne du formulaire.
//
// ⚠️ BROUILLON À FAIRE RELIRE. Ce texte décrit fidèlement ce que fait la
//    plateforme aujourd'hui, mais il n'a pas de valeur juridique tant qu'il
//    n'a pas été validé — d'autant que le traitement de données de SANTÉ
//    exige une autorisation préalable de la CDP, distincte de cette page.

export const metadata = {
  title: 'Politique de confidentialité — MANIA',
}

export default function ConfidentialitePage() {
  return (
    <div className="pub-page">
      <h1>Politique de confidentialité</h1>
      <p className="pub-date">Dernière mise à jour : {new Date().getFullYear()}</p>

      <h2>Qui traite vos données</h2>
      <p>
        MANIA, établi à Dakar (Sénégal), est responsable du traitement des données
        collectées sur ce site. Contact : <a href="mailto:contact@mania.sn">contact@mania.sn</a>.
      </p>

      <h2>Ce que nous collectons, et pourquoi</h2>
      <h3>Formulaire de candidature</h3>
      <p>
        Nom, adresse e-mail, téléphone, organisation, secteur d&apos;activité et
        description de votre besoin. Ces informations servent uniquement à étudier
        votre demande et à vous recontacter. La date de votre consentement est
        enregistrée.
      </p>
      <h3>Espace de formation</h3>
      <p>
        Nom, adresse e-mail, progression dans les cours, notes personnelles,
        inscriptions aux sessions. Ces données permettent de fournir le service.
      </p>
      <h3>Agents IA</h3>
      <p>
        Chaque client dispose d&apos;un espace isolé. Les contenus que vous y déposez
        vous appartiennent. MANIA n&apos;y accède pas, sauf demande explicite de votre
        part dans le cadre d&apos;une assistance technique.
      </p>

      <h2>Traitement par des services d&apos;intelligence artificielle</h2>
      <p>
        Le fonctionnement d&apos;un agent suppose l&apos;envoi de vos requêtes à un
        fournisseur de modèle de langage, qui peut être situé hors du Sénégal. Vous
        fournissez et contrôlez votre propre clé d&apos;accès à ce fournisseur.
      </p>
      <p>
        <strong>Données de santé.</strong> Elles relèvent d&apos;un régime renforcé et
        font l&apos;objet de mesures spécifiques. Ne transmettez pas de données
        identifiantes de patients à votre agent sans avoir vérifié avec nous le cadre
        applicable.
      </p>

      <h2>Durée de conservation</h2>
      <ul>
        <li>Candidatures non retenues : 12 mois.</li>
        <li>Comptes clients : durée de la relation contractuelle, puis 12 mois.</li>
        <li>Sauvegardes chiffrées : 30 jours glissants.</li>
      </ul>

      <h2>Sécurité</h2>
      <p>
        Accès protégé par mot de passe et authentification à deux facteurs.
        Chiffrement des échanges (HTTPS). Espaces clients isolés les uns des autres.
        Sauvegardes chiffrées, dont une copie hors site.
      </p>

      <h2>Vos droits</h2>
      <p>
        Conformément à la loi n°2008-12 du 25 janvier 2008 sur la protection des
        données à caractère personnel, vous disposez d&apos;un droit d&apos;accès, de
        rectification, d&apos;opposition et de suppression. Écrivez à{' '}
        <a href="mailto:contact@mania.sn">contact@mania.sn</a>. Vous pouvez saisir la
        Commission de protection des données personnelles (CDP) du Sénégal.
      </p>

      <h2>Cookies</h2>
      <p>
        Ce site dépose un cookie de session, strictement nécessaire à votre connexion.
        Aucun cookie publicitaire, aucune mesure d&apos;audience tierce.
      </p>
    </div>
  )
}
