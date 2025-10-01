/**
 * Tamil Translations for MediMate Malaysia
 * 
 * Complete localization for Tamil-speaking Malaysians with cultural context
 * for traditional Tamil medicine integration and Malaysian healthcare system.
 */

export const ta = {
  // பயன்பாட்டின் மையம்
  app: {
    name: 'MediMate',
    tagline: 'உங்கள் உடல்நலம், எங்கள் முன்னுரிமை',
    loading: 'ஏற்றுகிறது...',
    error: 'பிழை ஏற்பட்டது',
    retry: 'மீண்டும் முயற்சி செய்க',
    confirm: 'உறுதிப்படுத்து',
    cancel: 'ரத்து செய்',
    save: 'சேமி',
    delete: 'நீக்கு',
    edit: 'திருத்து',
    close: 'மூடு',
    next: 'அடுத்து',
    previous: 'முன்னர்',
    done: 'முடிந்தது',
    ok: 'சரி',
    yes: 'ஆம்',
    no: 'இல்லை',
  },

  // வழிசெலுத்தல்
  navigation: {
    home: 'முகப்பு',
    medications: 'மருந்துகள்',
    family: 'குடும்பம்',
    profile: 'சுயவிவரம்',
    settings: 'அமைப்புகள்',
    help: 'உதவி',
    emergency: 'அவசரநிலை',
    back: 'பின்செல்',
  },

  // அங்கீகரிப்பு
  auth: {
    signIn: 'உள்நுழை',
    signUp: 'பதிவு செய்',
    signOut: 'வெளியேறு',
    email: 'மின்னஞ்சல்',
    password: 'கடவுச்சொல்',
    confirmPassword: 'கடவுச்சொல்லை உறுதிப்படுத்து',
    forgotPassword: 'கடவுச்சொல் மறந்துவிட்டதா?',
    resetPassword: 'கடவுச்சொல்லை மீட்டமை',
    welcomeBack: 'மீண்டும் வரவேற்கிறோம்',
    createAccount: 'புதிய கணக்கை உருவாக்கு',
    invalidCredentials: 'தவறான மின்னஞ்சல் அல்லது கடவுச்சொல்',
    accountCreated: 'கணக்கு வெற்றிகரமாக உருவாக்கப்பட்டது',
    passwordReset: 'கடவுச்சொல் மீட்டமை மின்னஞ்சல் அனுப்பப்பட்டது',
  },

  // மருந்து மேலாண்மை
  medications: {
    title: 'மருந்துகள்',
    addMedication: 'மருந்து சேர்க்க',
    myMedications: 'என் மருந்துகள்',
    medicationName: 'மருந்தின் பெயர்',
    dosage: 'அளவு',
    frequency: 'அதிர்வெண்',
    instructions: 'வழிமுறைகள்',
    nextDose: 'அடுத்த அளவு',
    takeMedication: 'மருந்து எடுக்க',
    skipDose: 'அளவை தவிர்க்க',
    markAsTaken: 'எடுத்ததாக குறிக்க',
    
    // மலேசியா சார்ந்த மருந்தியல் சொற்கள்
    pharmaceuticalTerms: {
      ubat: 'மருந்து/மருந்தியல்',
      dos: 'அளவு',
      kekerapan: 'அதிர்வெண்',
      arahan: 'வழிமுறைகள்',
      sebelumMakan: 'உணவுக்கு முன்',
      selepasMakan: 'உணவுக்குப் பின்',
      bersamaMakanan: 'உணவுடன்',
      padaPerutKosong: 'வெறும் வயிற்றில்',
      pagi: 'காலை',
      tengahari: 'மதியம்',
      petang: 'மாலை',
      malam: 'இரவு',
      sebelumTidur: 'தூங்குவதற்கு முன்',
      mengikutKeperluan: 'தேவைக்கேற்ப',
    },

    // மலேசியாவில் பொதுவான டோஸ் வடிவங்கள்
    dosageForms: {
      tablet: 'மாத்திரை',
      capsule: 'காப்சூல்',
      syrup: 'சிரப்',
      suspension: 'நீர்க்கலவை',
      cream: 'கிரீம்',
      ointment: 'மேல்பூச்சு மருந்து',
      drops: 'துளிகள்',
      injection: 'ஊசி',
      inhaler: 'மூச்சு வழி மருந்து',
      patch: 'பட்டி',
      suppository: 'பின்புற மருந்து',
    },

    // அதிர்வெண் விருப்பங்கள்
    frequency: {
      onceDaily: 'நாளொன்றுக்கு ஒருமுறை',
      twiceDaily: 'நாளொன்றுக்கு இருமுறை (BD)',
      threeTimes: 'நாளொன்றுக்கு மூன்று முறை (TDS)',
      fourTimes: 'நாளொன்றுக்கு நான்கு முறை (QDS)',
      asNeeded: 'தேவைக்கேற்ப (PRN)',
      weekly: 'வாராந்திரம்',
      monthly: 'மாதாந்திரம்',
      custom: 'தனிப்பயன் அட்டவணை',
    },

    // மருந்து நினைவூட்டல்கள்
    reminders: {
      title: 'மருந்து நினைவூட்டல்கள்',
      timeForMedication: '{{medication}} எடுக்க வேண்டிய நேரம்',
      dosageReminder: '{{medication}} இன் {{dosage}} எடுக்கவும்',
      lateReminder: 'நீங்கள் {{medication}} எடுக்க தவறிவிட்டீர்கள்',
      prayerTimeConflict: '{{prayer}} தொழுகை காரணமாக மருந்து நேரம் சரிசெய்யப்பட்டது',
      ramadanAdjustment: 'ரமலான் நோன்பிற்கு அட்டவணை சரிசெய்யப்பட்டது',
    },

    // கலாச்சார மற்றும் மத கருத்துக்கள்
    cultural: {
      halalCertified: 'ஹலால் சான்றிதழ்',
      halalStatus: 'ஹலால் நிலை',
      halalChecking: 'ஹலால் நிலையை சரிபார்க்கிறது...',
      halalApproved: '{{authority}} ஆல் ஹலால் சான்றளிக்கப்பட்டது',
      halalUnknown: 'ஹலால் நிலை தெரியவில்லை - மருந்தகத்தை கேட்கவும்',
      halalConcern: 'ஹலால் அல்லாத பொருட்கள் இருக்கலாம்',
      prayerTimeAdjustment: 'தொழுகை நேரத்திற்கு சரிசெய்யப்பட்டது',
      ramadanSchedule: 'ரமலான் நோன்பு அட்டவணை',
      festivalConsideration: 'திருவிழா காலத்திற்கு சரிசெய்தல்',
    },
  },

  // குடும்ப மேலாண்மை
  family: {
    title: 'குடும்பம்',
    addMember: 'குடும்ப உறுப்பினரைச் சேர்க்க',
    familyMembers: 'குடும்ப உறுப்பினர்கள்',
    memberName: 'பெயர்',
    relationship: 'உறவு',
    age: 'வயது',
    
    relationships: {
      parent: 'பெற்றோர்',
      spouse: 'மனைவி/கணவர்',
      child: 'குழந்தை',
      grandparent: 'தாத்தா/பாட்டி',
      grandchild: 'பேரன்/பேத்தி',
      sibling: 'சகோதர/சகோதரி',
      other: 'மற்றவர்',
    },

    // மலேசிய குடும்ப அமைப்பு கருத்துக்கள்
    culturalFamily: {
      elderCare: 'முதியோர் பராமரிப்பு பொறுப்புகள்',
      multigenerational: 'பல தலைமுறை குடும்பம்',
      primaryCaregiver: 'முதன்மை பராமரிப்பாளர்',
      familyMedicationSharing: 'குடும்ப மருந்து ஒருங்கிணைப்பு',
      traditionalPractices: 'பாரம்பரிய உடல்நலம் பழக்கங்கள்',
    },
  },

  // கலாச்சார மற்றும் மத அம்சங்கள்
  cultural: {
    prayerTimes: {
      title: 'தொழுகை நேரங்கள்',
      fajr: 'பஜ்ர் (விடியல்)',
      dhuhr: 'துஹர் (மதியம்)',
      asr: 'அஸர் (பிற்பகல்)',
      maghrib: 'மக்ரிப் (மாலை)',
      isha: 'இஷா (இரவு)',
      nextPrayer: 'அடுத்த தொழுகை',
      timeUntil: '{{time}} இல்',
      prayerTimeNow: 'இப்போது தொழுகை நேரம்',
      adjustSchedule: 'மருந்து அட்டவணையை சரிசெய்',
      avoidPrayerTimes: 'தொழுகை நேரங்களைத் தவிர்க்க',
    },

    qibla: {
      title: 'கிப்லா திசை',
      direction: 'கிப்லா வடக்கிலிருந்து {{degrees}}° ஆகும்',
      accuracy: 'துல்லியம்: {{accuracy}}m',
      calibrate: 'திசைகாட்டியை அளவீடு செய்',
      locationPermission: 'இடம் அனுமதி தேவை',
    },

    festivals: {
      ramadan: 'ரமலான்',
      eid: 'ஈத் அல்-ஃபித்ர்',
      eidAdha: 'ஈத் அல்-அத்ஹா',
      chineseNewYear: 'சீன புத்தாண்டு',
      deepavali: 'தீபாவளி',
      christmas: 'கிறிஸ்துமஸ்',
      wesak: 'வேசாக் நாள்',
      adjustForFestival: '{{festival}} க்காக அட்டவணையை சரிசெய்',
      festivalGreeting: '{{festival}} வாழ்த்துக்கள்!',
    },

    languages: {
      changeLanguage: 'மொழியை மாற்று',
      currentLanguage: 'தற்போதைய: {{language}}',
      malay: 'மலாய்',
      english: 'ஆங்கிலம்',
      chinese: 'சீனம் (எளிமைப்படுத்தப்பட்ட)',
      tamil: 'தமிழ்',
      languageChanged: 'மொழி {{language}} க்கு மாற்றப்பட்டது',
    },
  },

  // அமைப்புகள்
  settings: {
    title: 'அமைப்புகள்',
    language: 'மொழி',
    notifications: 'அறிவிப்புகள்',
    privacy: 'தனியுரிமை',
    security: 'பாதுகாப்பு',
    cultural: 'கலாச்சார விருப்பங்கள்',
    accessibility: 'அணுகல்தன்மை',
    
    cultural: {
      title: 'கலாச்சார விருப்பங்கள்',
      prayerTimes: 'தொழுகை நேரங்கள்',
      qiblaDirection: 'கிப்லா திசை',
      halalValidation: 'ஹலால் சரிபார்ப்பு',
      festivalsCalendar: 'திருவிழாக்கள் நாட்காட்டி',
      languagePreferences: 'மொழி விருப்பங்கள்',
      familyStructure: 'குடும்ப அமைப்பு',
    },

    accessibility: {
      title: 'அணுகல்தன்மை',
      largeText: 'பெரிய உரை',
      highContrast: 'அதிக வேறுபாடு',
      voiceGuidance: 'குரல் வழிகாட்டுதல்',
      hapticFeedback: 'ஹப்டிக் பின்னூட்டம்',
      elderlyMode: 'முதியோர் நட்பு பயன்முறை',
      emergencyAccess: 'விரைவு அவசரகால அணுகல்',
    },
  },

  // அவசரநிலை
  emergency: {
    title: 'அவசரநிலை',
    call999: '999 ஐ அழைக்கவும்',
    hospitalNearby: 'அருகிலுள்ள மருத்துவமனை',
    pharmacyNearby: 'அருகிலுள்ள மருந்தகம்',
    emergencyContact: 'அவசரகால தொடர்பு',
    medicalInfo: 'மருத்துவ தகவல்',
    allergies: 'ஒவ்வாமைகள்',
    currentMedications: 'தற்போதைய மருந்துகள்',
    medicalConditions: 'மருத்துவ நிலைமைகள்',
    emergencyNote: 'அவசரநிலையில், மருத்துவ பணியாளர்களுக்கு இந்த தகவலை காட்டவும்',
  },

  // நேரம் மற்றும் தேதி
  time: {
    now: 'இப்போது',
    today: 'இன்று',
    tomorrow: 'நாளை',
    yesterday: 'நேற்று',
    thisWeek: 'இந்த வாரம்',
    nextWeek: 'அடுத்த வாரம்',
    minute: 'நிமிடம்',
    minutes: 'நிமிடங்கள்',
    hour: 'மணி',
    hours: 'மணிகள்',
    day: 'நாள்',
    days: 'நாட்கள்',
    week: 'வாரம்',
    weeks: 'வாரங்கள்',
    month: 'மாதம்',
    months: 'மாதங்கள்',
    year: 'வருடம்',
    years: 'வருடங்கள்',
    ago: 'முன்பு',
    in: 'இல்',
  },

  // பிழை செய்திகள்
  errors: {
    networkError: 'பிணைய இணைப்பு பிழை',
    serverError: 'சர்வர் பிழை ஏற்பட்டது',
    notFound: 'உருப்படி காணப்படவில்லை',
    unauthorized: 'அணுகல் மறுக்கப்பட்டது',
    forbidden: 'செயல்பாட்டிற்கு அனுமதி இல்லை',
    validationError: 'உங்கள் உள்ளீட்டை சரிபார்க்கவும்',
    medicationNotFound: 'மருந்து காணப்படவில்லை',
    prayerTimeUnavailable: 'இந்த இடத்திற்கு தொழுகை நேரங்கள் கிடைக்கவில்லை',
    locationPermissionDenied: 'இட அனுமதி தேவை',
    cameraPermissionDenied: 'கேமரா அனுமதி தேவை',
    unknown: 'அறியப்படாத பிழை ஏற்பட்டது',
  },

  // வெற்றிச் செய்திகள்
  success: {
    medicationAdded: 'மருந்து வெற்றிகரமாக சேர்க்கப்பட்டது',
    medicationUpdated: 'மருந்து வெற்றிகரமாக புதுப்பிக்கப்பட்டது',
    medicationDeleted: 'மருந்து வெற்றிகரமாக நீக்கப்பட்டது',
    reminderSet: 'நினைவூட்டல் வெற்றிகரமாக அமைக்கப்பட்டது',
    profileUpdated: 'சுயவிவரம் வெற்றிகரமாக புதுப்பிக்கப்பட்டது',
    settingsSaved: 'அமைப்புகள் வெற்றிகரமாக சேமிக்கப்பட்டது',
    familyMemberAdded: 'குடும்ப உறுப்பினர் வெற்றிகரமாக சேர்க்கப்பட்டார்',
  },

  // சரிபார்ப்பு செய்திகள்
  validation: {
    required: 'இந்த புலம் தேவை',
    invalidEmail: 'தவறான மின்னஞ்சல் முகவரி',
    invalidPassword: 'கடவுச்சொல் குறைந்தது 6 எழுத்துக்களாக இருக்க வேண்டும்',
    passwordMismatch: 'கடவுச்சொற்கள் பொருந்தவில்லை',
    invalidDosage: 'தவறான அளவு',
    invalidTime: 'தவறான நேர வடிவம்',
    maxLength: 'அதிகபட்சம் {{max}} எழுத்துக்கள் அனுமதிக்கப்படும்',
    minLength: 'குறைந்தது {{min}} எழுத்துக்கள் தேவை',
  },

  // மலேசிய சுகாதார சூழலுடன் மருந்து வழிமுறைகள்
  instructions: {
    common: {
      withMeals: 'வயிற்று கோளாறு குறைக்க உணவுடன் எடுக்கவும்',
      beforeMeals: 'சிறந்த உறிஞ்சுதலுக்கு உணவுக்கு 30 நிமிடம் முன் எடுக்கவும்',
      afterMeals: 'செரிமானத்திற்கு உதவ உணவுக்கு பின் எடுக்கவும்',
      emptyStomach: 'வெறும் வயிற்றில் எடுக்கவும் (உணவுக்கு 1 மணி முன் அல்லது 2 மணி பின்)',
      beforeSleep: 'படுக்கும் முன் எடுக்கவும்',
      asNeeded: 'அறிகுறிகள் ஏற்படும் போது மட்டும் எடுக்கவும்',
      completeAllDoses: 'நல்லது என்று உணர்ந்தாலும் முழு கோர்ஸையும் முடிக்கவும்',
      doNotCrush: 'முழுதாக விழுங்கவும் - நசுக்கவோ மெல்லவோ வேண்டாம்',
      storeInFridge: 'குளிர்சாதன பெட்டியில் வைக்கவும்',
      avoidAlcohol: 'இந்த மருந்து எடுக்கும் போது மது அருந்த வேண்டாம்',
      avoidSunlight: 'நீண்ட நேரம் வெயிலில் இருப்பதை தவிர்க்கவும்',
      drinkPlentyWater: 'நிறைய தண்ணீர் குடிக்கவும்',
    },

    cultural: {
      ramadanAdjustment: 'ரமலானின் போது, சஹூர் முன் அல்லது இஃப்தார் பின் நேரத்தை சரிசெய்யவும்',
      prayerTimeBuffer: 'தொழுகை நேரங்களுக்கு முன் 30 நிமிட இடைவெளி விடவும்',
      halalCertified: 'இந்த மருந்து ஹலால் சான்றிதழ் பெற்றது',
      traditionalMedicineWarning: 'பாரம்பரிய மருந்துகளுடன் சேர்ந்து எடுப்பதற்கு முன் கலந்தாலோசிக்கவும்',
      familyMedicationSharing: 'மருத்துவ ஒப்புதல் இல்லாமல் குடும்ப உறுப்பினர்களுடன் பகிர வேண்டாம்',
    },
  },
};

export default ta;