export type Language = 'es' | 'en'

export interface TranslationSchema {
  // Sidebar & Navigation
  addGame: string
  store: string
  specs: string
  downloads: string
  extensions: string
  settings: string
  exit: string

  // Top bar & Header
  library: string
  home: string
  friends: string
  noMusic: string
  gameSingular: string
  gamePlural: string
  loadingGames: string
  minutesPlayed: string
  lastTime: string
  searchPlaceholder: string
  refresh: string
  musicPlayer: string
  controllerConnected: string
  controllerDisconnected: string
  activeNoGame: string
  activeGame: string
  offlineDesc: string
  joinGame: string
  viewProfile: string
  otherFriends: string

  // Filters & Sorting
  filterAll: string
  filterInstalled: string
  filterFavorites: string
  sortNameAsc: string
  sortNameDesc: string
  sortLastPlayed: string
  sortDateAdded: string

  // Home card & Actions
  connected: string
  disconnected: string
  active: string
  play: string
  playing: string
  install: string
  download: string
  open: string

  // Context Menu (Game Cards)
  cmPlay: string
  cmPlaying: string
  cmInstall: string
  cmDetails: string
  cmEdit: string
  cmHide: string
  cmFavorite: string
  cmUnfavorite: string
  cmDesktopShortcut: string
  cmUninstall: string
  cmViewOnSteam: string
  cmDelete: string

  // Add / Edit Game Modal
  modalAddTitle: string
  modalEditTitle: string
  modalTabGeneral: string
  modalTabCustomization: string
  tabInstallation: string
  modalTabDetails: string
  modalTabDanger: string
  labelGameName: string
  labelExePath: string
  exeLabel: string
  exeDesc: string
  deletePath: string
  shortcutsSubTitle: string
  shortcutsSubTitleDesc: string
  browseFile: string
  labelIconUrl: string
  searchSteamGridDB: string
  personalizationArtwork: string
  artworkPersonalizationSub: string
  grid11: string
  cover: string
  icon: string
  hero: string
  noGrid11: string
  changeGrid11: string
  changeCover: string
  noCover: string
  changeBanner: string
  noBanner: string
  changeLogo: string
  noLogo: string
  changeIcon: string
  noIcon: string
  changeHero: string
  noHero: string
  btnPlay: string
  BtnEnter: string
  BtnEdit: string
  btnDownload: string
  btnSearchArtwork: string
  labelLaunchArgs: string
  labelCategory: string
  btnSave: string
  btnCancel: string
  btnDeleteGame: string
  btnBack: string
  deleteGameWarning: string

  // Game Details View
  backToLibrary: string
  buyOrViewInStore: string
  lastPlayed: string
  neverPlayed: string
  timePlayed: string
  achievements: string
  achievementsUnlocked: string
  stats: string
  noAchievements: string

  // Downloads Modal & Bar
  downloadsTitle: string
  pauseAll: string
  resumeAll: string
  clearCompleted: string
  noActiveDownloads: string
  statusPaused: string
  statusValidating: string
  statusQueued: string
  statusDownloading: string
  statusCompleted: string
  timeLeftSec: string
  timeLeftMin: string
  timeLeftHours: string
  itemSingular: string
  cmGoToGame: string
  cmHideFromList: string
  recentlyInstalled: string
  noRecentlyInstalled: string
  statusInstalled: string

  // Notifications
  installedSuccessfully: string
  readyToPlay: string
  playingGame: string
  playingGameDesc: string

  // Steam Connection
  steamConected: string
  steamNotConected: string
  steamCloseConnection1: string
  steamCloseConnection2: string
  steamLoginFailedDesc1: string
  steamLoginFailedDesc2: string

  // Music Player
  noMusicPlaying: string
  noMusicPlayingDesc: string
  controllingSystem: string
  selectTrack: string
  imported: string
  playingIn: string
  localMusic: string
  music: string
  volume: string

  // Detail View
  noScreenshotsFound: string
  screenshotAlt: string
  prevScreenshot: string
  nextScreenshot: string
  screenshotNumber: string
  aboutTheGame: string
  noDescriptionAvailable: string
  ageRatingFor: string
  positiveReviews: string
  negativeReviews: string
  developer: string
  publisher: string
  releaseDate: string
  recentReviews: string
  allReviews: string
  running: string
  downloading: string
  editGame: string

  // Settings Tabs
  tabHome: string
  tabCustomization: string
  tabHelp: string

  // Settings - Home Tab
  gamesAdd: string
  timePlayedSetting: string
  shortcutsTitle: string
  shortcutsSubtitle: string
  languageTitle: string
  languageDesc: string
  selectLanguage: string
  spanish: string
  english: string
  linkSteam: string
  steamLinked: string
  createSteamShortcut: string
  createHomeMenu: string
  optionsToStart: string
  advancedOptions: string
  advencePlaceholder: string
  deleteArgs: string
  unlink: string
  checkUpdates: string
  checkingUpdates: string
  downloadUpdate: string
  checkNewVersions: string
  updateAvailable: string
  updateAvailableDesc: string
  otherTitle: string
  otherSubtitle: string
  defaultStore: string
  omniconsoleTitle: string
  omniconsoleDesc: string
  backendPort: string
  backendPortDesc: string
  portInUse: string
  portChanged: string
  backendRestarting: string

  // Settings - Customization Tab
  profileTitle: string
  username: string
  usernameDesc: string
  customBackground: string
  defaultBackground: string
  changeBackground: string
  restoreBackground: string
  chooseFolder: string
  folderBackgrounds: string
  folderBackgroundsTitle: string
  backgroundCountSingular: string
  backgroundCountPlural: string

  // Settings - Installation Tab
  settingsInstallationTitle: string
  settingsInstallationSubtitle: string
  settingsInstallationDescription: string
  tipeDefaultInstallation: string

  // settings - delete tab
  deleteGame: string
  deleteGameSubtitle1: string
  deleteGameSubtitle2: string
  deleteBtnLibrary: string


  // Settings - Help Tab
  helpTitle: string
  helpSubtitle: string
  welcomeTutorial: string
  welcomeDescription: string
  viewTutorial: string

  // Helper Modal & General
  welcome: string
  welcomeHeading1: string
  welcomeDesc1: string
  welcomeHeading2: string
  welcomeDesc2: string
  welcomeHeading3: string
  welcomeDesc3: string
  dontShowAgain: string
  next: string
  start: string
  close: string
  confirm: string
  noGamesFound: string
  addYourFirstGame: string
}

export function t(template: string, params: Record<string, string | number>): string {
  return Object.entries(params).reduce(
    (result, [key, value]) => result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value)),
    template
  )
}

export const translations: Record<Language, TranslationSchema> = {
  es: {
    addGame: 'Agregar juego',
    store: 'Tienda',
    specs: 'Especificaciones',
    downloads: 'Descargas',
    extensions: 'Extensiones',
    settings: 'Ajustes',
    exit: 'Salir',

    library: 'Biblioteca',
    home: 'Inicio',
    friends: 'Amigos',
    noMusic: 'Sin música',
    gameSingular: 'juego',
    gamePlural: 'juegos',
    loadingGames: 'Cargando juegos...',
    minutesPlayed: 'jugados',
    lastTime: 'Última vez',
    searchPlaceholder: 'Buscar juegos...',
    refresh: 'Refrescar',
    musicPlayer: 'Reproductor de música',
    controllerConnected: 'Mando conectado',
    controllerDisconnected: 'Mando desconectado',

    filterAll: 'Todos los juegos',
    filterInstalled: 'Instalados',
    filterFavorites: 'Favoritos',
    sortNameAsc: 'Nombre (A-Z)',
    sortNameDesc: 'Nombre (Z-A)',
    sortLastPlayed: 'Último jugado',
    sortDateAdded: 'Fecha de agregado',

    connected: 'Conectado',
    disconnected: 'Desconectado',
    activeNoGame: 'Está conectado, pero no está jugando',
    activeGame: 'Jugando a',
    offlineDesc: 'No está conectado',
    joinGame: 'Unirse al juego',
    viewProfile: 'Ver perfil',
    otherFriends: 'Otros amigos',
    active: 'Activo',
    play: 'Jugar',
    playing: 'Jugando',
    install: 'Instalar',
    download: 'Descargar',
    open: 'Abrir',

    cmPlay: 'Jugar',
    cmPlaying: 'Jugando',
    cmInstall: 'Instalar',
    cmDetails: 'Ver detalles',
    cmEdit: 'Editar juego',
    cmHide: 'Ocultar',
    cmFavorite: 'Añadir a favoritos',
    cmUnfavorite: 'Quitar de favoritos',
    cmDesktopShortcut: 'Crear acceso directo en Escritorio',
    cmUninstall: 'Desinstalar',
    cmViewOnSteam: 'Ver en Steam',
    cmDelete: 'Eliminar de la biblioteca',

    modalAddTitle: 'Agregar nuevo juego',
    modalEditTitle: 'Editar juego',
    modalTabGeneral: 'Inicio',
    modalTabCustomization: 'Personalización',
    tabInstallation: 'Instalación',
    modalTabDetails: 'Detalles',
    modalTabDanger: 'Eliminar',
    labelGameName: 'Nombre del juego',
    labelExePath: 'Ruta del ejecutable',
    exeLabel: 'Ejecutable',
    exeDesc: 'Ruta del archivo que se ejecutará cuando presiones "Jugar"',
    deletePath: 'Borrar ruta',
    shortcutsSubTitle: 'Accesos directos',
    shortcutsSubTitleDesc: 'Crea accesos directos para ejecutar el juego rápidamente',
    grid11: 'Grid 1:1 (Row / Biblioteca)',
    cover: 'Portada',
    icon: 'Icono',
    hero: 'Hero',
    noGrid11: 'Sin grid 1:1',
    changeGrid11: 'Cambiar grid 1:1',
    changeCover: 'Cambiar portada',
    noCover: 'Sin portada',
    changeBanner: 'Cambiar banner',
    noBanner: 'Sin banner',
    changeLogo: 'Cambiar logo',
    noLogo: 'Sin logo',
    changeIcon: 'Cambiar icono',
    noIcon: 'Sin icono',
    changeHero: 'Cambiar hero',
    noHero: 'Sin hero',
    browseFile: 'Buscar archivo...',
    labelIconUrl: 'URL del icono o imagen',
    searchSteamGridDB: 'Buscar en SteamGridDB',
    personalizationArtwork: 'Personalización de Artwork',
    artworkPersonalizationSub: 'Elige carátulas, banners, logos e iconos de alta definición para este juego',
    btnSearchArtwork: 'Buscar Artwork',
    btnPlay: 'Jugar',
    BtnEnter: 'Entrar',
    BtnEdit: 'Editar',
    btnDownload: 'Descargar',
    labelLaunchArgs: 'Parámetros de lanzamiento',
    labelCategory: 'Categoría',
    btnSave: 'Guardar',
    btnCancel: 'Cancelar',
    btnDeleteGame: 'Eliminar juego',
    btnBack: 'Volver',
    deleteGameWarning: '¿Estás seguro de que deseas eliminar este juego de tu biblioteca?',

    settingsInstallationTitle: 'Instalación',
    settingsInstallationSubtitle: 'Configura la ubicación de tus juegos',
    settingsInstallationDescription: 'Aquí puedes cambiar la carpeta predeterminada donde se instalarán tus juegos',
    tipeDefaultInstallation: 'TIPO DE PLATAFORMA',

    deleteGame: 'Eliminar juego',
    deleteBtnLibrary: 'Eliminar juego de la biblioteca',
    deleteGameSubtitle1: 'Esta acción quitará el juego ',
    deleteGameSubtitle2: 'de tu biblioteca de HASHI. Tus archivos del juego en el disco no serán eliminados',

    backToLibrary: 'VOLVER A LA BIBLIOTECA',
    buyOrViewInStore: 'VER EN TIENDA',
    lastPlayed: 'Última sesión',
    neverPlayed: 'Nunca',
    timePlayed: 'Tiempo jugado',
    achievements: 'Logros',
    achievementsUnlocked: 'desbloqueados',
    stats: 'Estadísticas',
    noAchievements: 'No hay logros disponibles para este juego.',

    downloadsTitle: 'Descargas',
    pauseAll: 'Pausar todas',
    resumeAll: 'Reanudar todas',
    clearCompleted: 'Limpiar completadas',
    noActiveDownloads: 'No hay descargas activas',
    statusPaused: 'Pausado',
    statusValidating: 'Validando',
    statusQueued: 'En cola',
    statusDownloading: 'Descargando',
    statusCompleted: 'Completado',
    timeLeftSec: 's restantes',
    timeLeftMin: 'm restantes',
    timeLeftHours: 'h',
    itemSingular: '1 elemento',
    cmGoToGame: 'Ir al juego',
    cmHideFromList: 'Ocultar de la lista',
    recentlyInstalled: 'Instalados recientemente',
    noRecentlyInstalled: 'No hay juegos instalados recientemente',
    statusInstalled: 'Instalado',

    installedSuccessfully: 'instalado correctamente',
    readyToPlay: 'Listo para jugar',
    playingGame: 'Está jugando a ',
    playingGameDesc: 'Presiona Tab para ampliar',

    steamConected: 'Te has conectado correctamente.',
    steamNotConected: 'No se pudo conectar con Steam.',
    steamCloseConnection1: 'Puedes cerrar esta ventana o ',
    steamCloseConnection2: ' cerrarla automaticamente',
    steamLoginFailedDesc1: 'La autenticación no se completó.',
    steamLoginFailedDesc2: 'Intentar de nuevo.',

    noMusicPlaying: 'Sin música en reproducción',
    noMusicPlayingDesc: 'reproduce en Spotify/YouTube',
    controllingSystem: 'Controlando sistema',
    selectTrack: 'Seleccionar pista',
    imported: 'Importado',
    playingIn: 'En {{appName}}',
    localMusic: 'Música local',
    music: 'Música',
    volume: 'Volumen',

    noScreenshotsFound: 'No se encontraron capturas para este juego',
    screenshotAlt: 'Captura {{current}} de {{gameName}}',
    prevScreenshot: 'Captura anterior',
    nextScreenshot: 'Siguiente captura',
    screenshotNumber: 'Captura {{number}}',
    aboutTheGame: 'Acerca del juego',
    noDescriptionAvailable: 'No hay descripción disponible.',
    ageRatingFor: 'Clasificación por edades para: {{board}}',
    positiveReviews: 'Reseñas positivas',
    negativeReviews: 'Reseñas negativas',
    developer: 'Desarrollador',
    publisher: 'Editor',
    releaseDate: 'Fecha de lanzamiento',
    recentReviews: 'Reseñas recientes',
    allReviews: 'Todas las reseñas',
    running: 'Ejecutando...',
    downloading: 'Descargando...',
    editGame: 'Editar',

    tabHome: 'Inicio',
    tabCustomization: 'Personalización',
    tabHelp: 'Ayuda',

    gamesAdd: 'JUEGOS AGREGADOS',
    timePlayedSetting: 'Tiempo jugado',
    shortcutsTitle: 'Accesos directos',
    shortcutsSubtitle: 'Opciones rápidas y configuración del sistema',
    languageTitle: 'Idioma',
    languageDesc: 'Idioma de la interfaz',
    selectLanguage: 'Seleccionar idioma',
    spanish: 'Español',
    english: 'English',
    linkSteam: 'Vincular Steam',
    steamLinked: 'Cuenta conectada',
    createSteamShortcut: 'Crear atajo de Steam',
    createHomeMenu: 'Crear atajo en el menú de inicio',
    optionsToStart: 'Opciones para iniciar',
    advancedOptions: 'Los usuarios avanzados pueden ingresar sus modificaciones para el inicio de sus juegos (característica experimental)',
    advencePlaceholder: 'Sin parámetro especificado',
    deleteArgs: 'Borrar argumentos',
    unlink: 'Desvincular',
    checkUpdates: 'Buscar actualización',
    checkingUpdates: 'Buscando...',
    downloadUpdate: 'Descargar actualización',
    checkNewVersions: 'Comprobar nuevas versiones',
    updateAvailable: 'Hay una actualización disponible.',
    updateAvailableDesc: 'Haz clic para descargar la nueva versión',
    otherTitle: 'Otros',
    otherSubtitle: 'Configuración general de la aplicación',
    defaultStore: 'Tienda por defecto',
    omniconsoleTitle: 'Omniconsole',
    omniconsoleDesc: 'Evita que el launcher se oculte al ejecutar juegos',
    backendPort: 'Backend corriendo en',
    backendPortDesc: 'Puerto del servidor backend',
    portInUse: 'Este puerto ya está en uso',
    portChanged: 'Puerto cambiado. Reiniciando backend...',
    backendRestarting: 'Reiniciando backend...',

    profileTitle: 'Perfil',
    username: 'Nombre de usuario',
    usernameDesc: 'El nombre de usuario se guardará al salir o pulsar Enter. Haz clic en la foto para cambiarla (icono.png por defecto).',
    customBackground: 'Fondo personalizado',
    defaultBackground: 'Fondo por defecto',
    changeBackground: 'Cambiar fondo',
    restoreBackground: 'Restaurar',
    chooseFolder: 'Elegir carpeta',
    folderBackgrounds: 'Fondos de la carpeta',
    folderBackgroundsTitle: 'Fondos de la carpeta',
    backgroundCountSingular: 'fondo',
    backgroundCountPlural: 'fondos',

    helpTitle: 'Centro de ayuda y tutoriales',
    helpSubtitle: 'Explora las guías interactivas para conocer y aprovechar al máximo HASHI.',
    welcomeTutorial: 'Bienvenida',
    welcomeDescription: 'Guía de introducción sobre la organización de tus juegos de PC, Steam, accesos rápidos y personalización visual de la plataforma.',
    viewTutorial: 'Ver tutorial',

    welcome: 'Te damos la bienvenida a HASHI',
    welcomeHeading1: 'Tu lanzador de juegos personal',
    welcomeDesc1: 'Organiza y ejecuta todos tus juegos de PC, Steam y aplicaciones desde un solo lugar.',
    welcomeHeading2: '¡Personalízalo todo!',
    welcomeDesc2: 'Desde portadas hasta fondos, cada detalle está en tus manos.',
    welcomeHeading3: 'Todo listo para comenzar',
    welcomeDesc3: 'Disfruta de tu biblioteca personalizada con soporte para mando, efectos de sonido e interfaz inmersiva.',
    dontShowAgain: 'No mostrar de nuevo',
    next: 'Siguiente',
    start: 'Comenzar',
    close: 'Cerrar',
    confirm: 'Confirmar',
    noGamesFound: 'No se encontraron juegos',
    addYourFirstGame: 'Agrega tu primer juego para comenzar'
  },
  en: {
    addGame: 'Add game',
    store: 'Store',
    specs: 'Specs',
    downloads: 'Downloads',
    extensions: 'Extensions',
    settings: 'Settings',
    exit: 'Exit',

    library: 'Library',
    home: 'Home',
    friends: 'Friends',
    noMusic: 'No music',
    gameSingular: 'game',
    gamePlural: 'games',
    loadingGames: 'Loading games...',
    minutesPlayed: 'played',
    lastTime: 'Last played',
    searchPlaceholder: 'Search games...',
    refresh: 'Refresh',
    musicPlayer: 'Music player',
    controllerConnected: 'Controller connected',
    controllerDisconnected: 'Controller disconnected',

    filterAll: 'All games',
    filterInstalled: 'Installed',
    filterFavorites: 'Favorites',
    sortNameAsc: 'Name (A-Z)',
    sortNameDesc: 'Name (Z-A)',
    sortLastPlayed: 'Recently played',
    sortDateAdded: 'Date added',

    connected: 'Online',
    disconnected: 'Offline',
    activeNoGame: 'Online but not playing',
    activeGame: 'Playing',
    offlineDesc: 'Not connected',
    joinGame: 'Join game',
    viewProfile: 'View profile',
    otherFriends: 'Other friends',
    active: 'Active',
    play: 'Play',
    playing: 'Playing',
    install: 'Install',
    download: 'Download',
    open: 'Open',

    cmPlay: 'Play',
    cmPlaying: 'Playing',
    cmInstall: 'Install',
    cmDetails: 'View details',
    cmEdit: 'Edit game',
    cmHide: 'Hide',
    cmFavorite: 'Add to favorites',
    cmUnfavorite: 'Remove from favorites',
    cmDesktopShortcut: 'Create desktop shortcut',
    cmUninstall: 'Uninstall',
    cmViewOnSteam: 'View on Steam',
    cmDelete: 'Delete from library',

    modalAddTitle: 'Add new game',
    modalEditTitle: 'Edit game',
    modalTabGeneral: 'General',
    modalTabCustomization: 'Customization',
    tabInstallation: 'Installation',
    modalTabDetails: 'Details',
    modalTabDanger: 'Delete',
    labelGameName: 'Game name',
    labelExePath: 'Executable path',
    exeLabel: 'Executable',
    exeDesc: 'Path to the file that will be executed when you press "Play"',
    deletePath: 'Delete path',
    shortcutsSubTitle: 'Shortcuts',
    shortcutsSubTitleDesc: 'Create shortcuts to run the game quickly',
    grid11: 'Grid 1:1 (Row / Library)',
    cover: 'Cover',
    icon: 'Icon',
    hero: 'Hero',
    noGrid11: 'No grid 1:1',
    changeGrid11: 'Change grid 1:1',
    changeCover: 'Change cover',
    noCover: 'No cover',
    changeBanner: 'Change banner',
    noBanner: 'No banner',
    changeLogo: 'Change logo',
    noLogo: 'No logo',
    changeIcon: 'Change icon',
    noIcon: 'No icon',
    changeHero: 'Change hero',
    noHero: 'No hero',
    browseFile: 'Browse file...',
    labelIconUrl: 'Icon or image URL',
    searchSteamGridDB: 'Search on SteamGridDB',
    personalizationArtwork: 'Artwork Personalization',
    artworkPersonalizationSub: 'Choose high-definition covers, banners, logos and icons for this game',
    btnSearchArtwork: 'Search Artwork',
    btnPlay: 'Play',
    BtnEnter: 'Enter',
    BtnEdit: 'Edit',
    btnDownload: 'Download',
    labelLaunchArgs: 'Launch arguments',
    labelCategory: 'Category',
    btnSave: 'Save',
    btnCancel: 'Cancel',
    btnDeleteGame: 'Delete game',
    btnBack: 'Back',
    deleteGameWarning: 'Are you sure you want to delete this game from your library?',

    settingsInstallationTitle: 'Installation',
    settingsInstallationSubtitle: 'Configure the location of your games',
    settingsInstallationDescription: 'Here you can change the default folder where your games will be installed',
    tipeDefaultInstallation: 'PLATFORM TYPE',

    deleteGame: 'Delete game',
    deleteGameSubtitle1: 'This action will remove the game ',
    deleteGameSubtitle2: ' from your HASHI library. Your game files on disk will not be deleted.',
    deleteBtnLibrary: 'Delete from library',

    backToLibrary: 'BACK TO LIBRARY',
    buyOrViewInStore: 'VIEW IN STORE',
    lastPlayed: 'Last played',
    neverPlayed: 'Never',
    timePlayed: 'Time played',
    achievements: 'Achievements',
    achievementsUnlocked: 'unlocked',
    stats: 'Stats',
    noAchievements: 'No achievements available for this game.',

    downloadsTitle: 'Downloads',
    pauseAll: 'Pause all',
    resumeAll: 'Resume all',
    clearCompleted: 'Clear completed',
    noActiveDownloads: 'No active downloads',
    statusPaused: 'Paused',
    statusValidating: 'Validating',
    statusQueued: 'Queued',
    statusDownloading: 'Downloading',
    statusCompleted: 'Completed',
    timeLeftSec: 's left',
    timeLeftMin: 'm left',
    timeLeftHours: 'h',
    itemSingular: '1 item',
    cmGoToGame: 'Go to game',
    cmHideFromList: 'Hide from list',
    recentlyInstalled: 'Recently installed',
    noRecentlyInstalled: 'No recently installed games',
    statusInstalled: 'Installed',

    installedSuccessfully: 'installed successfully',
    readyToPlay: 'Ready to play',
    playingGame: 'is playing ',
    playingGameDesc: 'Press Tab to expand',

    steamConected: 'Steam connected',
    steamNotConected: 'Steam not connected',
    steamCloseConnection1: 'You can close this window or ',
    steamCloseConnection2: ' close it automatically',
    steamLoginFailedDesc1: 'The authentication was not completed.',
    steamLoginFailedDesc2: 'Try again.',



    noMusicPlaying: 'No music playing',
    noMusicPlayingDesc: 'Play in Spotify/YouTube',
    controllingSystem: 'Controlling system',
    selectTrack: 'Select track',
    imported: 'Imported',
    playingIn: 'On {{appName}}',
    localMusic: 'Local music',
    music: 'Music',
    volume: 'Volume',

    noScreenshotsFound: 'No screenshots found for this game',
    screenshotAlt: 'Screenshot {{current}} of {{gameName}}',
    prevScreenshot: 'Previous screenshot',
    nextScreenshot: 'Next screenshot',
    screenshotNumber: 'Screenshot {{number}}',
    aboutTheGame: 'About the game',
    noDescriptionAvailable: 'No description available.',
    ageRatingFor: 'Age rating for: {{board}}',
    positiveReviews: 'Positive reviews',
    negativeReviews: 'Negative reviews',
    developer: 'Developer',
    publisher: 'Publisher',
    releaseDate: 'Release date',
    recentReviews: 'Recent reviews',
    allReviews: 'All reviews',
    running: 'Running...',
    downloading: 'Downloading...',
    editGame: 'Edit',

    tabHome: 'Home',
    tabCustomization: 'Customization',
    tabHelp: 'Help',

    gamesAdd: 'GAMES ADDED',
    timePlayedSetting: 'Time played',
    shortcutsTitle: 'Shortcuts & System',
    shortcutsSubtitle: 'Quick options and system settings',
    languageTitle: 'Language',
    languageDesc: 'Interface language',
    selectLanguage: 'Select language',
    spanish: 'Spanish',
    english: 'English',
    linkSteam: 'Link Steam',
    steamLinked: 'Account connected',
    createSteamShortcut: 'Create Steam shortcut',
    createHomeMenu: 'Create home menu',
    optionsToStart: 'Options to start',
    advancedOptions: 'Advanced users can enter their modifications for starting their games (experimental feature)',
    advencePlaceholder: 'No parameter specified',
    deleteArgs: 'Delete arguments',
    unlink: 'Unlink',
    checkUpdates: 'Check for updates',
    checkingUpdates: 'Checking...',
    downloadUpdate: 'Download update',
    checkNewVersions: 'Check for new versions',
    updateAvailable: 'An update is available.',
    updateAvailableDesc: 'Click to download the new version',
    otherTitle: 'Other',
    otherSubtitle: 'General application settings',
    defaultStore: 'Default store',
    omniconsoleTitle: 'Omniconsole',
    omniconsoleDesc: 'Prevents the launcher from hiding when launching games',
    backendPort: 'Backend running on',
    backendPortDesc: 'Backend server port',
    portInUse: 'This port is already in use',
    portChanged: 'Port changed. Restarting backend...',
    backendRestarting: 'Restarting backend...',

    profileTitle: 'Profile',
    username: 'Username',
    usernameDesc: 'The username will be saved when you exit or press Enter. Click on the photo to change it (default icon.png).',
    customBackground: 'Custom background',
    defaultBackground: 'Default background',
    changeBackground: 'Change background',
    restoreBackground: 'Restore',
    chooseFolder: 'Choose folder',
    folderBackgrounds: 'Folder backgrounds',
    folderBackgroundsTitle: 'Folder backgrounds',
    backgroundCountSingular: 'wallpaper',
    backgroundCountPlural: 'wallpapers',

    helpTitle: 'Help Center & Tutorials',
    helpSubtitle: 'Explore interactive guides to discover and make the most of HASHI.',
    welcomeTutorial: 'Welcome',
    welcomeDescription: 'Introductory guide on organizing your PC games, Steam, quick access, and visual customization of the platform.',
    viewTutorial: 'View tutorial',

    welcome: 'Welcome to HASHI',
    welcomeHeading1: 'Your personal game launcher',
    welcomeDesc1: 'Organize and launch all your PC games, Steam titles, and apps from one place.',
    welcomeHeading2: 'Customize everything!',
    welcomeDesc2: 'From game covers to wallpapers, every detail is in your hands.',
    welcomeHeading3: 'All set to start',
    welcomeDesc3: 'Enjoy your customized library with controller support, sound effects, and an immersive interface.',
    dontShowAgain: "Don't show again",
    next: 'Next',
    start: 'Get started',
    close: 'Close',
    confirm: 'Confirm',
    noGamesFound: 'No games found',
    addYourFirstGame: 'Add your first game to get started'
  }
}

