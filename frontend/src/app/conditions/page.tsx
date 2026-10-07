import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, type LegalSection } from '@/components/site/LegalPage';
import { LEGAL, publisherName } from '@/lib/legal';

export const metadata: Metadata = {
  title: "Conditions d'utilisation — Juula Store",
  description:
    "Conditions générales d'utilisation de la plateforme Juula Store pour les marchands et leurs clients.",
};

const linkCls = 'text-[#1E60F8] font-semibold hover:underline';

const sections: LegalSection[] = [
  {
    id: 'objet',
    title: 'Objet',
    body: (
      <p>
        Les présentes conditions générales d&apos;utilisation (« CGU ») encadrent l&apos;accès et
        l&apos;utilisation de Juula Store, plateforme en ligne éditée par {publisherName()}, qui
        permet à des marchands de créer une boutique en ligne et des pages de vente, de recevoir des
        commandes et, s&apos;ils le souhaitent, d&apos;encaisser des paiements en ligne.
      </p>
    ),
  },
  {
    id: 'definitions',
    title: 'Définitions',
    body: (
      <ul>
        <li>
          <strong>Plateforme</strong> : le site {LEGAL.siteUrl}, le tableau de bord, les boutiques
          et les pages produits hébergées par Juula Store.
        </li>
        <li>
          <strong>Marchand</strong> : toute personne qui crée un compte pour vendre des produits.
        </li>
        <li>
          <strong>Client</strong> : toute personne qui commande auprès d&apos;un Marchand via la
          Plateforme.
        </li>
        <li>
          <strong>Boutique</strong> : le site de vente du Marchand, accessible à l&apos;adresse
          <em> nom-de-la-boutique</em>.juula.store.
        </li>
        <li>
          <strong>Page produit</strong> : la page de vente publique d&apos;un produit, accessible
          par un lien unique.
        </li>
        <li>
          <strong>Abonnement PRO</strong> : l&apos;abonnement payant qui permet de mettre la
          Boutique et les Pages produits en ligne.
        </li>
        <li>
          <strong>JuulaPay</strong> : le service optionnel de paiement en ligne (Wave, Orange Money,
          carte) proposé aux Marchands.
        </li>
        <li>
          <strong>Portefeuille</strong> : le solde des ventes payées via JuulaPay revenant au
          Marchand.
        </li>
        <li>
          <strong>Transaction hors plateforme</strong> : tout paiement ou échange qui ne passe pas
          par JuulaPay (voir l&apos;article « Transactions hors plateforme »).
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
        <Link href="/confidentialite" className={linkCls}>
          politique de confidentialité
        </Link>
        . En passant commande ou en envoyant un signalement, le Client accepte les articles qui le
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
    title: 'Inscription et connexion',
    body: (
      <p>
        L&apos;inscription et la connexion se font avec un compte Google dont l&apos;adresse e-mail
        est vérifiée. Le Marchand garantit que les informations de son compte sont exactes. Un même
        compte Google correspond à un seul compte Marchand.
      </p>
    ),
  },
  {
    id: 'securite-compte',
    title: 'Sécurité du compte',
    body: (
      <p>
        Le Marchand est responsable de la sécurité de son compte Google, de ses appareils et de son
        code PIN de retrait, qu&apos;il ne doit communiquer à personne. Juula Store ne lui demandera
        jamais son code PIN. Toute action réalisée depuis son compte est réputée faite par lui. En
        cas d&apos;accès suspect, il doit modifier immédiatement son code PIN et sécuriser son
        compte Google.
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
          <li>
            une Boutique en ligne avec son adresse dédiée, et un éditeur de Pages produits (photos,
            vidéos, avis, FAQ, offres par quantité) ;
          </li>
          <li>la réception et le suivi des commandes dans un tableau de bord ;</li>
          <li>
            plusieurs modes de commande et de paiement : paiement à la livraison, commande sur
            WhatsApp, liens de paiement propres au Marchand et, en option, JuulaPay ;
          </li>
          <li>un Portefeuille et des retraits vers Mobile Money pour les ventes JuulaPay ;</li>
          <li>
            des outils marketing : codes promo, barre d&apos;annonce, ventes croisées, liens
            partenaires (affiliation) et pixels publicitaires Meta, TikTok et Google ;
          </li>
          <li>des statistiques de visites et de ventes ;</li>
          <li>un annuaire public des boutiques et un système de signalement.</li>
        </ul>
        <p>
          Juula Store est un outil technique : il n&apos;est ni le vendeur, ni le livreur des
          produits.
        </p>
      </>
    ),
  },
  {
    id: 'abonnement',
    title: 'Abonnement PRO',
    body: (
      <ul>
        <li>
          La création du compte, de la Boutique et des Pages produits est gratuite. Leur mise en
          ligne nécessite un Abonnement PRO actif, au prix de 3 900 FCFA par mois.
        </li>
        <li>
          L&apos;abonnement est payé à l&apos;avance en ligne, via notre prestataire de paiement
          agréé, pour une période de 30 jours. Il n&apos;est pas reconduit automatiquement : le
          Marchand le renouvelle depuis son tableau de bord.
        </li>
        <li>
          À l&apos;expiration de l&apos;abonnement, la Boutique et les Pages produits ne sont plus
          accessibles au public et la Boutique est retirée de l&apos;annuaire. Les données du
          Marchand sont conservées : un renouvellement remet tout en ligne.
        </li>
        <li>
          Une période commencée n&apos;est pas remboursable, sauf disposition légale contraire.
          Juula Store peut offrir des périodes d&apos;accès PRO à titre commercial.
        </li>
        <li>
          Toute modification du prix est annoncée avant son application et ne concerne que les
          périodes payées ensuite.
        </li>
      </ul>
    ),
  },
  {
    id: 'annuaire',
    title: 'Annuaire public des boutiques',
    body: (
      <p>
        Les Boutiques publiées disposant d&apos;un Abonnement PRO actif peuvent apparaître dans
        l&apos;annuaire public (page{' '}
        <Link href="/boutiques" className={linkCls}>
          Boutiques
        </Link>{' '}
        et page d&apos;accueil), avec leur nom, logo, image de couverture, slogan, catégorie et
        produits. La mention « Boutique vérifiée » indique uniquement que la Boutique dispose
        d&apos;un abonnement actif et n&apos;est pas suspendue : elle ne constitue pas une garantie
        sur les produits, le Marchand ou les transactions. L&apos;ordre d&apos;affichage est
        déterminé librement par Juula Store.
      </p>
    ),
  },
  {
    id: 'pages-produits',
    title: 'Pages produits et liens de partage',
    body: (
      <p>
        Chaque produit dispose d&apos;un lien unique et permanent, partageable sur les réseaux
        sociaux, WhatsApp ou en publicité. Une page n&apos;est visible du public qu&apos;une fois
        publiée et tant que l&apos;Abonnement PRO est actif ; un brouillon ou une page désactivée
        n&apos;est accessible qu&apos;à son Marchand. Le Marchand peut désactiver ou supprimer une
        page à tout moment.
      </p>
    ),
  },
  {
    id: 'contenus',
    title: 'Contenus publiés par le Marchand',
    body: (
      <p>
        Le Marchand est seul responsable des textes, prix, photos, vidéos, avis, témoignages et
        comparatifs qu&apos;il publie. Il garantit détenir les droits nécessaires sur ces contenus
        et qu&apos;ils sont exacts, loyaux et non trompeurs. Les avis et preuves clients affichés
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
    title: 'Prix et informations produits',
    body: (
      <p>
        Le Marchand fixe librement ses prix, frais de livraison, remises par quantité et codes
        promo, exprimés en francs CFA (FCFA) toutes taxes comprises. Le montant d&apos;une commande,
        remises et codes promo compris, est calculé par la Plateforme à partir des informations
        publiées au moment de la commande. Le Marchand doit tenir à jour ses stocks et ses délais.
      </p>
    ),
  },
  {
    id: 'commandes',
    title: 'Commandes des Clients',
    body: (
      <p>
        Le Client passe commande depuis une Page produit ou le panier de la Boutique en indiquant
        son nom, son numéro WhatsApp et son adresse de livraison. La commande est transmise au
        Marchand avec une référence unique. Le contrat de vente est conclu directement entre le
        Client et le Marchand ; le Marchand confirme la commande et contacte le Client, notamment
        par WhatsApp.
      </p>
    ),
  },
  {
    id: 'modes-paiement',
    title: 'Modes de paiement',
    body: (
      <>
        <p>Selon les choix du Marchand, le Client peut payer :</p>
        <ul>
          <li>
            <strong>en ligne via JuulaPay</strong> (Wave, Orange Money, carte) : seul mode de
            paiement traité par la Plateforme ;
          </li>
          <li>
            <strong>à la livraison</strong>, directement au Marchand ou à son livreur ;
          </li>
          <li>
            <strong>via un lien de paiement propre au Marchand</strong> (Wave Business, Orange Money
            ou autre) ;
          </li>
          <li>
            <strong>selon les modalités convenues sur WhatsApp</strong> avec le Marchand.
          </li>
        </ul>
        <p>
          Les trois derniers modes sont des transactions hors plateforme, soumises à l&apos;article
          suivant.
        </p>
      </>
    ),
  },
  {
    id: 'hors-plateforme',
    title: 'Transactions hors plateforme',
    body: (
      <>
        <p>
          <strong>Les transactions hors plateforme ne sont couvertes par aucune garantie.</strong>
        </p>
        <p>
          Est une transaction hors plateforme tout paiement qui ne passe pas par JuulaPay : paiement
          à la livraison, lien de paiement du Marchand, virement, transfert Mobile Money envoyé
          directement au Marchand, paiement en espèces, ou tout accord conclu sur WhatsApp, par
          téléphone ou sur un autre site.
        </p>
        <p>
          Juula Store n&apos;encaisse pas ces sommes, n&apos;en a pas connaissance et ne peut ni les
          geler, ni les rembourser, ni en garantir la bonne fin. Le séquestre, le gel des fonds et
          le remboursement décrits dans les présentes CGU ne s&apos;appliquent qu&apos;aux commandes
          payées via JuulaPay. Pour être protégé, le Client est invité à privilégier le paiement en
          ligne JuulaPay et à ne jamais envoyer d&apos;argent à un vendeur en dehors de la
          Plateforme avant d&apos;avoir vérifié sa commande.
        </p>
      </>
    ),
  },
  {
    id: 'juulapay',
    title: 'Paiement en ligne JuulaPay',
    body: (
      <p>
        JuulaPay est optionnel : le Marchand l&apos;active ou le désactive depuis son tableau de
        bord. Les paiements sont traités par notre prestataire de paiement agréé. En activant
        JuulaPay, le Marchand mandate Juula Store pour encaisser en son nom les sommes payées par
        ses Clients et les lui reverser via le Portefeuille, déduction faite de la commission. Une
        commande n&apos;est considérée comme payée qu&apos;après confirmation du paiement par le
        prestataire.
      </p>
    ),
  },
  {
    id: 'commission',
    title: 'Commission JuulaPay',
    body: (
      <p>
        Chaque paiement reçu via JuulaPay donne lieu à une commission de 7,5 % du montant payé. Le
        montant crédité au Portefeuille est le montant net de cette commission. Aucune commission
        n&apos;est prélevée sur les transactions hors plateforme. Toute modification du taux est
        annoncée avant son application et ne concerne que les paiements postérieurs.
      </p>
    ),
  },
  {
    id: 'delai-72h',
    title: 'Disponibilité des fonds : délai de 72 heures',
    body: (
      <p>
        Le montant d&apos;une vente payée via JuulaPay est d&apos;abord affiché « en attente » dans
        le Portefeuille et ne devient retirable que{' '}
        <strong>72 heures après la confirmation du paiement</strong>, sauf gel décidé dans le cadre
        d&apos;un litige. Le tableau de bord indique la date du prochain déblocage.
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
    id: 'sequestre',
    title: 'Séquestre et gel des fonds',
    body: (
      <>
        <p>
          En cas de litige, de signalement, de suspicion de fraude ou de paiement contesté
          concernant une commande payée via JuulaPay, Juula Store peut geler cette commande. Tant
          qu&apos;elle est gelée :
        </p>
        <ul>
          <li>
            son montant n&apos;entre jamais dans le solde retirable du Marchand, même après le délai
            de 72 heures ;
          </li>
          <li>
            le Marchand en est informé dans son tableau de bord et ne peut ni retirer ni réclamer
            ces fonds ;
          </li>
          <li>
            si le montant avait déjà été retiré, il est déduit des encaissements JuulaPay suivants
            du Marchand.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'litiges',
    title: 'Résolution des litiges et remboursements',
    body: (
      <>
        <p>
          Tout litige relatif à un produit ou à une livraison doit d&apos;abord être réglé entre le
          Client et le Marchand. Pour une commande payée via JuulaPay, Juula Store peut examiner le
          dossier, demander des justificatifs (preuve de livraison, échanges, photos) et décider
          souverainement :
        </p>
        <ul>
          <li>
            soit de <strong>libérer les fonds</strong> au Marchand, notamment s&apos;il prouve la
            livraison ;
          </li>
          <li>
            soit de <strong>rembourser le Client</strong> (colis non reçu, produit non conforme ou
            endommagé, arnaque), par virement Mobile Money vers le Client ; le montant est alors
            retiré définitivement du Portefeuille du Marchand.
          </li>
        </ul>
        <p>
          Chaque décision est archivée avec un rapport. Une commande payée en ligne ne peut pas être
          annulée par le Marchand depuis son tableau de bord ; une commande payée à la livraison
          peut l&apos;être.
        </p>
      </>
    ),
  },
  {
    id: 'livraison',
    title: 'Livraison et service après-vente',
    body: (
      <p>
        La livraison, sa qualité, ses délais, la garantie des produits et le service après-vente
        relèvent de la seule responsabilité du Marchand, qui s&apos;engage à respecter les délais et
        conditions annoncés sur sa Boutique et ses Pages produits ainsi que les droits des
        consommateurs.
      </p>
    ),
  },
  {
    id: 'signalements',
    title: 'Signalements',
    body: (
      <>
        <p>
          Toute personne peut signaler une Boutique ou un produit grâce au lien « Signaler » présent
          sur chaque Boutique et chaque Page produit. Le signalement comprend les coordonnées de son
          auteur, un motif, une description et jusqu&apos;à cinq photos (preuves de paiement,
          captures d&apos;écran, photos du colis).
        </p>
        <ul>
          <li>
            Les signalements sont traités par l&apos;équipe de sécurité de Juula Store, qui répond à
            leur auteur par e-mail ; les réponses de l&apos;auteur sont rattachées au dossier.
          </li>
          <li>Les coordonnées de l&apos;auteur ne sont jamais transmises au Marchand signalé.</li>
          <li>
            Les signalements abusifs, mensongers ou répétés dans le but de nuire sont interdits et
            peuvent entraîner des poursuites.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'moderation',
    title: 'Modération et sanctions',
    body: (
      <>
        <p>
          Pour protéger les Clients et la Plateforme, notamment à la suite d&apos;un signalement,
          Juula Store peut, selon la gravité des faits :
        </p>
        <ul>
          <li>
            désactiver un produit, avec un motif communiqué au Marchand, qui ne peut plus le
            republier ;
          </li>
          <li>
            suspendre une Boutique, qui affiche alors « Boutique temporairement indisponible » et ne
            peut plus recevoir de commandes ;
          </li>
          <li>suspendre un compte Marchand, ce qui met fin à toutes ses sessions ;</li>
          <li>
            supprimer un produit, ou un compte et sa Boutique en cas de manquement grave ou répété ;
          </li>
          <li>geler les fonds concernés comme prévu à l&apos;article « Séquestre ».</li>
        </ul>
        <p>
          Chaque sanction est enregistrée avec sa date et son motif. Juula Store en informe le
          Marchand, sauf urgence, obligation légale ou risque de fraude.
        </p>
      </>
    ),
  },
  {
    id: 'marketing',
    title: 'Codes promo et liens partenaires',
    body: (
      <p>
        Les codes promo, ventes croisées et liens partenaires (affiliation) sont créés et paramétrés
        par le Marchand, qui fixe seul leurs conditions et les commissions versées à ses
        partenaires. Ces commissions sont à sa charge et réglées directement par lui : Juula Store
        fournit uniquement le suivi des visites et des ventes attribuées, sans être partie à la
        relation entre le Marchand et ses partenaires.
      </p>
    ),
  },
  {
    id: 'pixels',
    title: 'Pixels publicitaires',
    body: (
      <p>
        Le Marchand qui connecte un pixel Meta, TikTok ou une balise Google agit sous sa propre
        responsabilité : il respecte les conditions de ces plateformes, informe ses Clients de
        l&apos;utilisation de ces traceurs et recueille, le cas échéant, leur consentement. Juula
        Store transmet les événements de navigation et de commande configurés, sans garantie sur les
        résultats publicitaires.
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
        dans la{' '}
        <Link href="/confidentialite" className={linkCls}>
          politique de confidentialité
        </Link>
        .
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
        (redimensionnement des images, aperçu des liens partagés, annuaire des boutiques) dans le
        seul but de fournir et de promouvoir le service, pour la durée de leur publication.
      </p>
    ),
  },
  {
    id: 'usages-interdits',
    title: 'Usages interdits de la Plateforme',
    body: (
      <ul>
        <li>contourner les mesures de sécurité ou accéder aux données d&apos;autres Marchands ;</li>
        <li>passer de fausses commandes, simuler des paiements ou de faux avis ;</li>
        <li>
          inciter un Client à payer hors plateforme dans le but de le tromper ou de contourner une
          sanction ;
        </li>
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
        peut suspendre les retraits, geler les fonds concernés le temps des vérifications, demander
        des justificatifs et signaler les faits aux autorités compétentes, conformément à la
        réglementation en vigueur.
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
        prestataires (hébergement, paiement, envoi d&apos;e-mails, réseaux mobiles) peuvent
        entraîner des indisponibilités temporaires.
      </p>
    ),
  },
  {
    id: 'cloture',
    title: 'Clôture du compte',
    body: (
      <p>
        Le Marchand peut cesser d&apos;utiliser la Plateforme et demander la clôture de son compte à
        tout moment ; le solde disponible lui est reversé après les délais de disponibilité, la
        résolution des litiges en cours et les éventuelles vérifications. Juula Store peut clôturer
        un compte dans les cas prévus à l&apos;article « Modération et sanctions ».
      </p>
    ),
  },
  {
    id: 'responsabilite',
    title: 'Limitation de responsabilité',
    body: (
      <p>
        Juula Store est tenu d&apos;une obligation de moyens. Sa responsabilité ne saurait être
        engagée pour les produits vendus, les relations entre Marchands et Clients, les transactions
        hors plateforme, les pertes de chiffre d&apos;affaires indirectes, ni pour les dommages
        résultant d&apos;une mauvaise utilisation du compte. En tout état de cause, sa
        responsabilité est limitée aux sommes perçues du Marchand au titre des douze derniers mois.
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
        retraits, signalements, échanges par e-mail, décisions de modération, journaux de connexion)
        font foi entre les parties, sauf preuve contraire.
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
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Conditions"
      title="Conditions générales d'utilisation"
      intro={
        <p>
          Ces conditions expliquent les règles entre Juula Store, les marchands qui vendent sur la
          plateforme et leurs clients : abonnement, boutiques et pages produits, commandes, modes de
          paiement, JuulaPay, délai de 72 heures, gel des fonds et litiges, signalements, modération
          et responsabilités de chacun.{' '}
          <strong>Les transactions hors plateforme ne sont couvertes par aucune garantie.</strong>
        </p>
      }
      sections={sections}
    />
  );
}
