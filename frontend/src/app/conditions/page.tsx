import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, type LegalSection } from '@/components/site/LegalPage';
import { LEGAL, publisherName } from '@/lib/legal';

export const metadata: Metadata = {
  title: "Conditions d'utilisation — Juula Store",
  description:
    "Conditions générales d'utilisation de la plateforme Juula Store pour les marchands et leurs clients.",
};

const support = (
  <a href={LEGAL.whatsappLink} className="text-[#1E60F8] font-semibold hover:underline">
    support WhatsApp ({LEGAL.whatsapp})
  </a>
);

const sections: LegalSection[] = [
  {
    id: 'objet',
    title: 'Objet',
    body: (
      <p>
        Les présentes conditions générales d&apos;utilisation (« CGU ») encadrent l&apos;accès et
        l&apos;utilisation de Juula Store, plateforme en ligne éditée par {publisherName()}, qui
        permet à des marchands de créer des pages de vente, de recevoir des commandes et
        d&apos;encaisser des paiements.
      </p>
    ),
  },
  {
    id: 'definitions',
    title: 'Définitions',
    body: (
      <ul>
        <li>
          <strong>Plateforme</strong> : le site {LEGAL.siteUrl}, le tableau de bord et les pages
          produits.
        </li>
        <li>
          <strong>Marchand</strong> : toute personne qui crée un compte pour vendre des produits.
        </li>
        <li>
          <strong>Client</strong> : toute personne qui commande sur la page produit d&apos;un
          Marchand.
        </li>
        <li>
          <strong>Page produit</strong> : la page de vente publique créée par un Marchand,
          accessible par un lien unique.
        </li>
        <li>
          <strong>Portefeuille</strong> : le solde des ventes payées en ligne revenant au Marchand.
        </li>
        <li>
          <strong>Crédit lead</strong> : unité consommée à la réception d&apos;une commande.
        </li>
      </ul>
    ),
  },
  {
    id: 'acceptation',
    title: 'Acceptation des conditions',
    body: (
      <p>
        En créant un compte, le Marchand accepte sans réserve les présentes CGU ainsi que la{' '}
        <Link href="/confidentialite" className="text-[#1E60F8] font-semibold hover:underline">
          politique de confidentialité
        </Link>
        . En passant commande sur une Page produit, le Client accepte les articles qui le
        concernent. Si vous n&apos;acceptez pas ces conditions, n&apos;utilisez pas la Plateforme.
      </p>
    ),
  },
  {
    id: 'eligibilite',
    title: 'Conditions pour devenir Marchand',
    body: (
      <p>
        Le Marchand doit être majeur, disposer de la capacité juridique de contracter et exercer une
        activité commerciale licite. Il s&apos;engage à respecter les obligations légales et
        fiscales liées à son activité, notamment en matière d&apos;immatriculation et de déclaration
        de ses revenus.
      </p>
    ),
  },
  {
    id: 'inscription',
    title: 'Inscription et connexion avec Google',
    body: (
      <p>
        L&apos;inscription et la connexion se font exclusivement avec un compte Google dont
        l&apos;adresse e-mail est vérifiée. Le Marchand garantit que les informations de son compte
        Google sont exactes. Un même compte Google correspond à un seul compte Marchand.
      </p>
    ),
  },
  {
    id: 'securite-compte',
    title: 'Sécurité du compte',
    body: (
      <p>
        Le Marchand est responsable de la sécurité de son compte Google, de ses appareils et de son
        code PIN de retrait, qu&apos;il ne doit communiquer à personne. Toute action réalisée depuis
        son compte est réputée faite par lui. En cas d&apos;accès suspect, il doit prévenir
        immédiatement le {support}.
      </p>
    ),
  },
  {
    id: 'service',
    title: 'Description du service',
    body: (
      <>
        <p>Juula Store fournit notamment :</p>
        <ul>
          <li>un éditeur de pages produits avec photos, vidéos, avis et offres par quantité ;</li>
          <li>la réception et le suivi des commandes dans un tableau de bord ;</li>
          <li>le paiement à la livraison et le paiement en ligne Wave, Orange Money ou carte ;</li>
          <li>un portefeuille et des retraits vers Mobile Money ;</li>
          <li>la connexion de pixels publicitaires Meta et TikTok.</li>
        </ul>
        <p>
          Juula Store est un outil technique : il n&apos;est ni le vendeur, ni le livreur des
          produits.
        </p>
      </>
    ),
  },
  {
    id: 'pages-produits',
    title: 'Pages produits et liens de partage',
    body: (
      <p>
        Chaque produit dispose d&apos;un lien unique et permanent, partageable sur les réseaux
        sociaux, WhatsApp ou en publicité. Une page n&apos;est visible du public qu&apos;une fois
        publiée ; un brouillon ou une page désactivée n&apos;est accessible qu&apos;à son Marchand.
        Le Marchand peut désactiver ou supprimer une page à tout moment.
      </p>
    ),
  },
  {
    id: 'contenus',
    title: 'Contenus publiés par le Marchand',
    body: (
      <p>
        Le Marchand est seul responsable des textes, prix, photos, vidéos, avis et témoignages
        qu&apos;il publie. Il garantit détenir les droits nécessaires sur ces contenus et
        qu&apos;ils sont exacts, loyaux et non trompeurs. Les avis et preuves clients affichés
        doivent être authentiques.
      </p>
    ),
  },
  {
    id: 'produits-interdits',
    title: 'Produits et activités interdits',
    body: (
      <>
        <p>Il est interdit de vendre ou promouvoir via la Plateforme :</p>
        <ul>
          <li>
            des produits contrefaits, volés ou dont la vente est interdite ou réglementée sans
            autorisation ;
          </li>
          <li>des armes, stupéfiants, médicaments sans autorisation ou produits dangereux ;</li>
          <li>
            tout contenu illicite, haineux, pornographique ou portant atteinte aux droits
            d&apos;autrui ;
          </li>
          <li>des offres trompeuses, pyramidales ou frauduleuses.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'prix',
    title: 'Prix, stocks et informations produits',
    body: (
      <p>
        Le Marchand fixe librement ses prix, frais de livraison et remises par quantité, exprimés en
        francs CFA (FCFA) toutes taxes comprises. Le montant d&apos;une commande est calculé par la
        Plateforme à partir des informations publiées au moment de la commande. Le Marchand doit
        tenir à jour ses stocks et ses délais.
      </p>
    ),
  },
  {
    id: 'commandes',
    title: 'Commandes des Clients',
    body: (
      <p>
        Le Client passe commande en indiquant son nom, son numéro WhatsApp et son adresse de
        livraison. La commande est transmise au Marchand avec une référence unique. Le contrat de
        vente est conclu directement entre le Client et le Marchand ; le Marchand confirme la
        commande et contacte le Client, notamment par WhatsApp.
      </p>
    ),
  },
  {
    id: 'cod',
    title: 'Paiement à la livraison',
    body: (
      <p>
        Lorsque le Client choisit le paiement à la livraison, il règle le Marchand ou son livreur
        directement. Ces sommes ne transitent pas par Juula Store et n&apos;alimentent pas le
        Portefeuille.
      </p>
    ),
  },
  {
    id: 'paiement-en-ligne',
    title: 'Paiement en ligne',
    body: (
      <p>
        Les paiements en ligne (Wave, Orange Money, carte) sont traités par notre prestataire de
        paiement agréé. En activant ce mode, le Marchand mandate Juula Store pour encaisser en son
        nom les sommes payées par ses Clients et les lui reverser via le Portefeuille. Une commande
        n&apos;est considérée comme payée qu&apos;après confirmation du paiement par le prestataire.
      </p>
    ),
  },
  {
    id: 'delai-72h',
    title: 'Disponibilité des fonds : délai de 72 heures',
    body: (
      <p>
        Le prestataire de paiement règle les fonds 72 heures après chaque paiement. En conséquence,
        le montant d&apos;une vente payée en ligne est d&apos;abord affiché « en attente » dans le
        Portefeuille et ne devient retirable que{' '}
        <strong>72 heures après la confirmation du paiement</strong>. Le tableau de bord indique la
        date du prochain déblocage.
      </p>
    ),
  },
  {
    id: 'retraits',
    title: 'Retraits vers Mobile Money',
    body: (
      <ul>
        <li>
          Le montant minimum d&apos;un retrait est de 1 000 FCFA, dans la limite du solde
          disponible.
        </li>
        <li>Chaque retrait doit être autorisé avec le code PIN du Marchand.</li>
        <li>
          Le Marchand est responsable de l&apos;exactitude du numéro Wave ou Orange Money saisi ; un
          virement envoyé vers un numéro erroné fourni par lui ne peut pas être garanti.
        </li>
        <li>
          Un retrait refusé par le prestataire est annulé et son montant est recrédité au
          Portefeuille.
        </li>
      </ul>
    ),
  },
  {
    id: 'commission',
    title: 'Commissions et frais',
    body: (
      <p>
        Juula Store peut prélever une commission sur les ventes payées en ligne. Le montant crédité
        au Portefeuille est le montant net de cette commission. Tout taux de commission ou toute
        modification est porté à la connaissance du Marchand avant son application et ne
        s&apos;applique qu&apos;aux paiements postérieurs.
      </p>
    ),
  },
  {
    id: 'credits',
    title: 'Crédits leads et forfaits',
    body: (
      <p>
        Des crédits leads sont offerts à l&apos;ouverture du compte, puis peuvent être rechargés par
        forfaits (Pack Découverte, Pack Croissance, Pack Scaler Pro) dont les prix sont affichés sur
        la page{' '}
        <Link href="/#tarifs" className="text-[#1E60F8] font-semibold hover:underline">
          Tarifs
        </Link>
        . Un crédit est consommé à la réception d&apos;une commande. Les crédits achetés
        n&apos;expirent pas, ne sont ni remboursables ni convertibles en argent, sauf disposition
        légale contraire.
      </p>
    ),
  },
  {
    id: 'annulations',
    title: 'Annulations et remboursements',
    body: (
      <p>
        Le Marchand peut annuler une commande payée à la livraison. Une commande déjà payée en ligne
        ne peut pas être annulée depuis le tableau de bord : le remboursement du Client est traité
        par l&apos;intermédiaire du {support}, et le montant correspondant est déduit du
        Portefeuille du Marchand.
      </p>
    ),
  },
  {
    id: 'livraison',
    title: 'Livraison et service après-vente',
    body: (
      <p>
        La livraison, sa qualité, ses délais, la garantie des produits et le service après-vente
        relèvent de la seule responsabilité du Marchand, qui s&apos;engage à respecter les délais et
        conditions annoncés sur sa Page produit et les droits des consommateurs.
      </p>
    ),
  },
  {
    id: 'litiges-clients',
    title: 'Litiges entre Clients et Marchands',
    body: (
      <p>
        Tout litige relatif à un produit ou à une livraison doit d&apos;abord être réglé entre le
        Client et le Marchand. Juula Store peut, sans y être tenu, faciliter un règlement amiable
        et, en cas de manquement avéré du Marchand pour une commande payée en ligne, procéder au
        remboursement du Client sur le Portefeuille du Marchand.
      </p>
    ),
  },
  {
    id: 'pixels',
    title: 'Pixels publicitaires',
    body: (
      <p>
        Le Marchand qui connecte un Pixel Meta ou TikTok agit sous sa propre responsabilité : il
        respecte les conditions de ces plateformes, informe ses Clients de l&apos;utilisation de ces
        traceurs et recueille, le cas échéant, leur consentement. Juula Store transmet les
        événements de navigation et de commande configurés, sans garantie sur les résultats
        publicitaires.
      </p>
    ),
  },
  {
    id: 'donnees-clients',
    title: 'Données personnelles des Clients',
    body: (
      <p>
        Le Marchand est responsable du traitement des données de ses Clients et ne les utilise que
        pour gérer leurs commandes, dans le respect de la loi sénégalaise sur la protection des
        données personnelles. Il est interdit de revendre ces données ou de les utiliser pour du
        démarchage non sollicité. Juula Store les traite en tant que sous-traitant, comme décrit
        dans la politique de confidentialité.
      </p>
    ),
  },
  {
    id: 'propriete-juula',
    title: 'Propriété intellectuelle de Juula Store',
    body: (
      <p>
        La marque Juula, le logo, le design, le code et l&apos;ensemble des éléments de la
        Plateforme sont la propriété de l&apos;éditeur. Le Marchand bénéficie d&apos;un droit
        d&apos;utilisation personnel, non exclusif et non transférable, pour la durée de son compte.
        Toute copie ou reproduction non autorisée est interdite.
      </p>
    ),
  },
  {
    id: 'licence-contenus',
    title: 'Licence sur les contenus du Marchand',
    body: (
      <p>
        Le Marchand reste propriétaire de ses contenus. Il accorde à Juula Store une licence
        gratuite et non exclusive pour les héberger, les afficher et les adapter techniquement
        (redimensionnement des images, aperçu des liens partagés) dans le seul but de fournir le
        service, pour la durée de leur publication.
      </p>
    ),
  },
  {
    id: 'usages-interdits',
    title: 'Usages interdits de la Plateforme',
    body: (
      <ul>
        <li>contourner les mesures de sécurité ou accéder aux données d&apos;autres Marchands ;</li>
        <li>passer de fausses commandes ou simuler des paiements ;</li>
        <li>extraire massivement des données (scraping) ou surcharger le service ;</li>
        <li>utiliser la Plateforme pour du blanchiment ou toute opération frauduleuse.</li>
      </ul>
    ),
  },
  {
    id: 'fraude',
    title: 'Lutte contre la fraude',
    body: (
      <p>
        En cas de suspicion de fraude, de paiement contesté ou d&apos;activité illicite, Juula Store
        peut suspendre les retraits, retenir les fonds concernés le temps des vérifications,
        demander des justificatifs et signaler les faits aux autorités compétentes, conformément à
        la réglementation en vigueur.
      </p>
    ),
  },
  {
    id: 'disponibilite',
    title: 'Disponibilité du service',
    body: (
      <p>
        Juula Store s&apos;efforce d&apos;assurer un service accessible en permanence mais ne peut
        garantir une disponibilité sans interruption. Des maintenances ou des incidents chez nos
        prestataires (hébergement, paiement, réseaux mobiles) peuvent entraîner des indisponibilités
        temporaires.
      </p>
    ),
  },
  {
    id: 'suspension',
    title: 'Suspension et clôture du compte',
    body: (
      <p>
        Le Marchand peut demander la clôture de son compte à tout moment auprès du {support} ; le
        solde disponible lui est reversé après les délais de disponibilité et les éventuelles
        vérifications. Juula Store peut suspendre ou clôturer un compte en cas de manquement grave
        aux présentes CGU, après information du Marchand sauf urgence ou obligation légale.
      </p>
    ),
  },
  {
    id: 'responsabilite',
    title: 'Limitation de responsabilité',
    body: (
      <p>
        Juula Store est tenu d&apos;une obligation de moyens. Sa responsabilité ne saurait être
        engagée pour les produits vendus, les relations entre Marchands et Clients, les pertes de
        chiffre d&apos;affaires indirectes, ni pour les dommages résultant d&apos;une mauvaise
        utilisation du compte. En tout état de cause, sa responsabilité est limitée aux sommes
        perçues au titre des douze derniers mois.
      </p>
    ),
  },
  {
    id: 'force-majeure',
    title: 'Force majeure',
    body: (
      <p>
        Aucune partie n&apos;est responsable d&apos;un manquement causé par un événement de force
        majeure, notamment une coupure générale des réseaux de télécommunication ou
        d&apos;électricité, une décision des autorités ou une défaillance d&apos;un opérateur de
        Mobile Money.
      </p>
    ),
  },
  {
    id: 'preuve',
    title: 'Preuve',
    body: (
      <p>
        Les enregistrements des systèmes de Juula Store (commandes, confirmations de paiement,
        retraits, journaux de connexion) font foi entre les parties, sauf preuve contraire.
      </p>
    ),
  },
  {
    id: 'modifications',
    title: 'Modification des CGU',
    body: (
      <p>
        Juula Store peut modifier les présentes CGU. Les Marchands sont informés de toute
        modification importante avant son entrée en vigueur ; la poursuite de l&apos;utilisation de
        la Plateforme vaut acceptation de la nouvelle version.
      </p>
    ),
  },
  {
    id: 'nullite',
    title: 'Nullité partielle',
    body: (
      <p>
        Si une clause des présentes CGU était déclarée nulle ou inapplicable, les autres clauses
        resteraient en vigueur.
      </p>
    ),
  },
  {
    id: 'droit-applicable',
    title: 'Droit applicable et juridiction',
    body: (
      <p>
        Les présentes CGU sont régies par le droit sénégalais. À défaut de règlement amiable, tout
        litige relève de la compétence des juridictions de Dakar, sous réserve des règles
        impératives protégeant les consommateurs.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <p>
        Pour toute question sur ces conditions, contactez le {support}
        {LEGAL.email && (
          <>
            {' '}
            ou écrivez à{' '}
            <a
              href={`mailto:${LEGAL.email}`}
              className="text-[#1E60F8] font-semibold hover:underline"
            >
              {LEGAL.email}
            </a>
          </>
        )}
        .
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Conditions"
      title="Conditions générales d'utilisation"
      intro={
        <p>
          Ces conditions expliquent les règles du jeu entre Juula Store, les marchands qui vendent
          sur la plateforme et leurs clients : création des pages produits, commandes, paiements,
          délai de 72 heures, retraits et responsabilités de chacun.
        </p>
      }
      sections={sections}
    />
  );
}
