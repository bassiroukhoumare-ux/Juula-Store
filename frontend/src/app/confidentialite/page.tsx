import type { Metadata } from 'next';
import { LegalPage, type LegalSection } from '@/components/site/LegalPage';
import { LEGAL, publisherName } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Politique de confidentialité — Juula Store',
  description:
    'Comment Juula Store collecte, utilise et protège les données des marchands et de leurs clients.',
  alternates: { canonical: '/confidentialite' },
};

const contact = (
  <>
    via le formulaire « Signaler » présent sur chaque boutique (motif « Autre motif »), en précisant
    votre demande : notre équipe vous répond par e-mail
  </>
);

const sections: LegalSection[] = [
  {
    id: 'responsable',
    title: 'Qui est responsable de vos données ?',
    body: (
      <>
        <p>
          Le service Juula Store est édité par <strong>{publisherName()}</strong>
          {LEGAL.address && <>, dont le siège est situé {LEGAL.address}</>}
          {LEGAL.rccm && <>, immatriculé au RCCM sous le n° {LEGAL.rccm}</>}
          {LEGAL.ninea && <> (NINEA {LEGAL.ninea})</>}.
        </p>
        <p>Juula Store intervient à deux titres :</p>
        <ul>
          <li>
            <strong>Responsable de traitement</strong> pour les données des marchands qui créent un
            compte (identité, boutique, portefeuille, retraits).
          </li>
          <li>
            <strong>Sous-traitant</strong> pour les données des clients finaux qui commandent sur la
            page d&apos;un marchand : nous les traitons uniquement pour le compte et sur instruction
            de ce marchand, qui reste responsable de leur utilisation.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'donnees-marchands',
    title: 'Les données que nous collectons sur les marchands',
    body: (
      <>
        <ul>
          <li>
            <strong>Identité de connexion</strong> transmise par Google lors de l&apos;inscription :
            nom, adresse e-mail vérifiée et photo de profil. Nous ne recevons jamais votre mot de
            passe Google.
          </li>
          <li>
            <strong>Informations de boutique</strong> : nom, code de commande, numéro WhatsApp de
            support, paramètres de livraison et de paiement, pages produits (textes, prix, photos,
            vidéos, avis).
          </li>
          <li>
            <strong>Données financières</strong> : historique des ventes en ligne, solde du
            portefeuille, retraits et numéros Wave / Orange Money de destination.
          </li>
          <li>
            <strong>Code PIN de retrait</strong> : stocké uniquement sous forme chiffrée
            irréversible (bcrypt) ; personne chez Juula ne peut le lire.
          </li>
          <li>
            <strong>Identifiants de pixels publicitaires</strong> (Meta, TikTok, Google) que vous
            choisissez d&apos;ajouter.
          </li>
          <li>
            <strong>Abonnement</strong> : historique des paiements de l&apos;Abonnement PRO et dates
            de validité.
          </li>
          <li>
            <strong>Préférences</strong> : par exemple le thème clair ou sombre du tableau de bord.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'donnees-clients',
    title: 'Les données des clients qui commandent',
    body: (
      <>
        <p>Lorsqu&apos;un client passe commande sur une page produit, nous collectons :</p>
        <ul>
          <li>son nom, son numéro WhatsApp, son quartier et son adresse de livraison ;</li>
          <li>le produit, la quantité, la couleur choisie et le mode de paiement ;</li>
          <li>
            pour un paiement en ligne, la référence de transaction transmise par notre prestataire
            de paiement.
          </li>
        </ul>
        <p>
          Ces informations sont transmises au marchand concerné pour qu&apos;il confirme et livre la
          commande. Les coordonnées de paiement du client (compte Wave, Orange Money ou carte) sont
          saisies directement chez notre prestataire de paiement :{' '}
          <strong>Juula Store ne les reçoit ni ne les stocke</strong>.
        </p>
      </>
    ),
  },
  {
    id: 'signalements',
    title: 'Les données des signalements',
    body: (
      <>
        <p>
          Lorsqu&apos;une personne signale une boutique ou un produit, nous collectons : son prénom,
          son nom, son adresse e-mail, son numéro WhatsApp ou de téléphone, le motif, sa
          description, jusqu&apos;à cinq photos, l&apos;adresse de la page concernée, la date,
          l&apos;adresse IP et le navigateur utilisé. Les échanges par e-mail avec notre équipe
          (réponses et pièces jointes) sont rattachés au dossier.
        </p>
        <p>
          Ces données servent uniquement à traiter le signalement et à protéger les acheteurs. Elles
          sont réservées à l&apos;équipe de sécurité de Juula Store et{' '}
          <strong>ne sont jamais transmises au marchand signalé</strong>.
        </p>
      </>
    ),
  },
  {
    id: 'finalites',
    title: 'Pourquoi nous utilisons ces données',
    body: (
      <ul>
        <li>Créer et sécuriser votre compte, vous authentifier (exécution du contrat).</li>
        <li>
          Publier vos pages produits et transmettre les commandes à leur marchand (exécution du
          contrat).
        </li>
        <li>
          Encaisser les paiements en ligne, calculer le solde du portefeuille et exécuter les
          retraits (exécution du contrat et obligations légales comptables).
        </li>
        <li>
          Prévenir la fraude, les abus et les faux paiements : limitation du nombre de requêtes,
          vérification de chaque paiement auprès du prestataire (intérêt légitime).
        </li>
        <li>
          Traiter les signalements, les litiges et les décisions de modération (intérêt légitime).
        </li>
        <li>Afficher les boutiques abonnées dans l&apos;annuaire public (exécution du contrat).</li>
        <li>
          Respecter nos obligations légales et répondre aux demandes des autorités compétentes.
        </li>
      </ul>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies et traceurs',
    body: (
      <>
        <p>Le tableau de bord utilise uniquement des cookies strictement nécessaires :</p>
        <ul>
          <li>un cookie de session (valable 15 minutes, renouvelé automatiquement) ;</li>
          <li>un cookie de renouvellement de session (7 jours maximum) ;</li>
          <li>un jeton anti-falsification de requêtes (CSRF).</li>
        </ul>
        <p>
          Ces cookies sont protégés (<em>httpOnly</em>, <em>Secure</em>, <em>SameSite</em>) et ne
          servent à aucune publicité. Ils ne nécessitent pas de consentement car le service ne peut
          pas fonctionner sans eux.
        </p>
      </>
    ),
  },
  {
    id: 'pixels',
    title: 'Pixels publicitaires Meta, TikTok et Google',
    body: (
      <>
        <p>
          Un marchand peut ajouter à sa boutique un Pixel Meta (Facebook / Instagram), un Pixel
          TikTok et/ou une balise Google. Sur ses pages produits, ces outils reçoivent alors des
          événements de navigation : visite de la page, consultation du produit, ouverture du
          formulaire de commande et commande validée (avec le montant et la référence de commande).
        </p>
        <p>
          Ces pixels sont activés{' '}
          <strong>à l&apos;initiative et sous la responsabilité du marchand</strong>, qui doit
          informer ses clients et, le cas échéant, recueillir leur consentement. Meta et TikTok
          traitent ensuite ces données selon leurs propres politiques de confidentialité. Juula
          Store n&apos;ajoute aucun pixel publicitaire pour son propre compte.
        </p>
      </>
    ),
  },
  {
    id: 'destinataires',
    title: 'Avec qui nous partageons les données',
    body: (
      <>
        <p>Nous ne vendons jamais vos données. Elles sont accessibles uniquement :</p>
        <ul>
          <li>au marchand concerné, pour les commandes passées sur ses pages ;</li>
          <li>
            à l&apos;équipe Juula habilitée, pour le traitement des signalements et des litiges et
            la lutte contre la fraude ;
          </li>
          <li>
            à nos prestataires techniques, chacun limité à sa mission : <strong>Google</strong>{' '}
            (connexion),
            <strong> Neon</strong> (base de données), <strong>Vercel</strong> (hébergement de
            l&apos;application),
            <strong> Cloudinary</strong> (stockage des images produits et des photos de
            signalement), <strong>Moneriz</strong> (paiements en ligne et virements Mobile Money),{' '}
            <strong>Resend</strong> (envoi et réception des e-mails), <strong>Upstash</strong>{' '}
            (protection contre les abus) ;
          </li>
          <li>aux autorités, lorsque la loi nous y oblige.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'transferts',
    title: 'Transferts hors du Sénégal',
    body: (
      <p>
        Certains de nos prestataires hébergent les données hors du Sénégal, notamment aux États-Unis
        (base de données et hébergement). Ces transferts sont nécessaires au fonctionnement du
        service et sont encadrés par les engagements contractuels de sécurité et de confidentialité
        de ces prestataires, conformément aux règles applicables aux transferts internationaux
        prévues par la loi sénégalaise.
      </p>
    ),
  },
  {
    id: 'conservation',
    title: 'Combien de temps nous les conservons',
    body: (
      <ul>
        <li>
          Compte marchand : pendant toute la durée d&apos;utilisation du service, puis supprimé à sa
          clôture.
        </li>
        <li>
          Commandes, paiements et retraits : 10 ans, durée de conservation des pièces comptables
          prévue par l&apos;Acte uniforme OHADA relatif au droit comptable.
        </li>
        <li>
          Signalements et échanges associés : le temps du traitement du dossier, puis aussi
          longtemps que nécessaire à la gestion d&apos;un éventuel litige.
        </li>
        <li>Sessions de connexion : 7 jours maximum.</li>
        <li>Journaux techniques des notifications de paiement : 90 jours.</li>
        <li>Journaux d&apos;envoi d&apos;e-mails techniques : 30 jours.</li>
      </ul>
    ),
  },
  {
    id: 'securite',
    title: 'Comment nous protégeons vos données',
    body: (
      <ul>
        <li>Toutes les communications sont chiffrées (HTTPS).</li>
        <li>Connexion exclusivement via Google, avec adresse e-mail vérifiée.</li>
        <li>Code PIN de retrait chiffré et blocage temporaire après plusieurs essais erronés.</li>
        <li>
          Chaque paiement en ligne est revérifié directement auprès du prestataire avant d&apos;être
          crédité ; les montants sont toujours recalculés par nos serveurs.
        </li>
        <li>
          Accès aux données limité aux seules personnes qui en ont besoin, actions
          d&apos;administration tracées.
        </li>
      </ul>
    ),
  },
  {
    id: 'droits',
    title: 'Vos droits',
    body: (
      <>
        <p>
          Conformément à la loi n° 2008-12 du 25 janvier 2008 sur la protection des données à
          caractère personnel, vous disposez d&apos;un droit d&apos;accès, de rectification,
          d&apos;opposition pour motif légitime et de suppression de vos données.
        </p>
        <p>
          Vous pouvez exercer ces droits {contact}. Nous répondons dans un délai d&apos;un mois.
        </p>
        <p>
          Les clients d&apos;un marchand peuvent s&apos;adresser directement à ce marchand, ou à
          nous par le même formulaire : nous transmettrons leur demande. Vous pouvez également
          saisir la Commission de Protection des Données Personnelles du Sénégal (CDP).
        </p>
      </>
    ),
  },
  {
    id: 'mineurs',
    title: 'Mineurs',
    body: (
      <p>
        La création d&apos;un compte marchand est réservée aux personnes majeures. Nous ne
        collectons pas sciemment de données concernant des mineurs ; si vous pensez que c&apos;est
        le cas, contactez-nous {contact} afin que nous les supprimions.
      </p>
    ),
  },
  {
    id: 'modifications',
    title: 'Modifications de cette politique',
    body: (
      <p>
        Nous pouvons faire évoluer cette politique pour refléter l&apos;évolution du service ou de
        la réglementation. La date de dernière mise à jour figure en haut de la page ; en cas de
        changement important, nous en informons les marchands avant son entrée en vigueur.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Confidentialité"
      title="Politique de confidentialité"
      intro={
        <p>
          Chez Juula Store, vos données et celles de vos clients servent à une seule chose : faire
          fonctionner votre boutique. Cette page explique, sans jargon, ce que nous collectons,
          pourquoi, avec qui nous le partageons et comment exercer vos droits.
        </p>
      }
      sections={sections}
    />
  );
}
