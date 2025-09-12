/**
 * Bahasa Malaysia Translations for MediMate Malaysia
 * 
 * Comprehensive localization for Bahasa Malaysia speakers with Malaysian
 * healthcare terminology and cultural context.
 */

export const ms = {
  // Teras Aplikasi
  app: {
    name: 'MediMate',
    tagline: 'Kesihatan Anda, Keutamaan Kami',
    loading: 'Memuat...',
    error: 'Ralat berlaku',
    retry: 'Cuba Lagi',
    confirm: 'Sahkan',
    cancel: 'Batal',
    save: 'Simpan',
    delete: 'Padam',
    edit: 'Edit',
    close: 'Tutup',
    next: 'Seterusnya',
    previous: 'Sebelumnya',
    done: 'Selesai',
    ok: 'OK',
    yes: 'Ya',
    no: 'Tidak',
  },

  // Navigasi
  navigation: {
    home: 'Utama',
    medications: 'Ubat-ubatan',
    family: 'Keluarga',
    profile: 'Profil',
    settings: 'Tetapan',
    help: 'Bantuan',
    emergency: 'Kecemasan',
    back: 'Kembali',
  },

  // Pengesahan
  auth: {
    signIn: 'Log Masuk',
    signUp: 'Daftar',
    signOut: 'Log Keluar',
    email: 'E-mel',
    password: 'Kata Laluan',
    confirmPassword: 'Sahkan Kata Laluan',
    forgotPassword: 'Lupa Kata Laluan?',
    resetPassword: 'Set Semula Kata Laluan',
    welcomeBack: 'Selamat kembali',
    createAccount: 'Buat akaun baharu',
    invalidCredentials: 'E-mel atau kata laluan tidak sah',
    accountCreated: 'Akaun berjaya dicipta',
    passwordReset: 'E-mel set semula kata laluan telah dihantar',
  },

  // Pengurusan Ubat
  medications: {
    title: 'Ubat-ubatan',
    addMedication: 'Tambah Ubat',
    myMedications: 'Ubat Saya',
    medicationName: 'Nama Ubat',
    dosage: 'Dos',
    frequency: 'Kekerapan',
    instructions: 'Arahan',
    nextDose: 'Dos Seterusnya',
    takeMedication: 'Ambil Ubat',
    skipDose: 'Langkau Dos',
    markAsTaken: 'Tandai Telah Diambil',
    
    // Istilah farmaseutikal Malaysia
    pharmaceuticalTerms: {
      ubat: 'Ubat/Ubatan',
      dos: 'Dos',
      kekerapan: 'Kekerapan',
      arahan: 'Arahan',
      sebelumMakan: 'Sebelum makan',
      selepasMakan: 'Selepas makan',
      bersamaMakanan: 'Bersama makanan',
      padaPerutKosong: 'Pada perut kosong',
      pagi: 'Pagi',
      tengahari: 'Tengah hari',
      petang: 'Petang',
      malam: 'Malam',
      sebelumTidur: 'Sebelum tidur',
      mengikutKeperluan: 'Mengikut keperluan',
    },

    // Bentuk dos yang biasa di Malaysia
    dosageForms: {
      tablet: 'Tablet',
      capsule: 'Kapsul',
      syrup: 'Sirap',
      suspension: 'Suspensi',
      cream: 'Krim',
      ointment: 'Salap',
      drops: 'Titisan',
      injection: 'Suntikan',
      inhaler: 'Inhaler',
      patch: 'Tampalan',
      suppository: 'Supositri',
    },

    // Pilihan kekerapan
    frequency: {
      onceDaily: 'Sekali sehari',
      twiceDaily: 'Dua kali sehari (BD)',
      threeTimes: 'Tiga kali sehari (TDS)',
      fourTimes: 'Empat kali sehari (QDS)',
      asNeeded: 'Mengikut keperluan (PRN)',
      weekly: 'Mingguan',
      monthly: 'Bulanan',
      custom: 'Jadual tersuai',
    },

    // Peringatan ubat
    reminders: {
      title: 'Peringatan Ubat',
      timeForMedication: 'Masa untuk mengambil {{medication}}',
      dosageReminder: 'Ambil {{dosage}} {{medication}}',
      lateReminder: 'Anda terlepas dos {{medication}}',
      prayerTimeConflict: 'Masa ubat diselaraskan kerana solat {{prayer}}',
      ramadanAdjustment: 'Jadual diselaraskan untuk puasa Ramadan',
    },

    // Pertimbangan budaya dan agama
    cultural: {
      halalCertified: 'Sijil Halal',
      halalStatus: 'Status Halal',
      halalChecking: 'Memeriksa status halal...',
      halalApproved: 'Disahkan halal oleh {{authority}}',
      halalUnknown: 'Status halal tidak diketahui - sila tanya farmasi',
      halalConcern: 'Mungkin mengandungi bahan tidak halal',
      prayerTimeAdjustment: 'Diselaraskan untuk waktu solat',
      ramadanSchedule: 'Jadual puasa Ramadan',
      festivalConsideration: 'Penyesuaian tempoh perayaan',
    },
  },

  // Pengurusan Keluarga
  family: {
    title: 'Keluarga',
    addMember: 'Tambah Ahli Keluarga',
    familyMembers: 'Ahli Keluarga',
    memberName: 'Nama',
    relationship: 'Hubungan',
    age: 'Umur',
    
    relationships: {
      parent: 'Ibu Bapa',
      spouse: 'Pasangan',
      child: 'Anak',
      grandparent: 'Datuk/Nenek',
      grandchild: 'Cucu',
      sibling: 'Adik-beradik',
      other: 'Lain-lain',
    },

    // Pertimbangan struktur keluarga Malaysia
    culturalFamily: {
      elderCare: 'Tanggungjawab menjaga warga emas',
      multigenerational: 'Isi rumah berbilang generasi',
      primaryCaregiver: 'Penjaga utama',
      familyMedicationSharing: 'Penyelarasan ubat keluarga',
      traditionalPractices: 'Amalan kesihatan tradisional',
    },
  },

  // Ciri Budaya & Agama
  cultural: {
    prayerTimes: {
      title: 'Waktu Solat',
      fajr: 'Subuh',
      dhuhr: 'Zohor',
      asr: 'Asar',
      maghrib: 'Maghrib',
      isha: 'Isyak',
      nextPrayer: 'Solat seterusnya',
      timeUntil: 'dalam {{time}}',
      prayerTimeNow: 'Waktu solat sekarang',
      adjustSchedule: 'Laraskan jadual ubat',
      avoidPrayerTimes: 'Elakkan waktu solat',
    },

    qibla: {
      title: 'Arah Kiblat',
      direction: 'Kiblat adalah {{degrees}}° dari Utara',
      accuracy: 'Ketepatan: {{accuracy}}m',
      calibrate: 'Kalibrasi kompas',
      locationPermission: 'Kebenaran lokasi diperlukan',
    },

    festivals: {
      ramadan: 'Ramadan',
      eid: 'Hari Raya Aidilfitri',
      eidAdha: 'Hari Raya Haji',
      chineseNewYear: 'Tahun Baharu Cina',
      deepavali: 'Deepavali',
      christmas: 'Krismas',
      wesak: 'Hari Wesak',
      adjustForFestival: 'Laraskan jadual untuk {{festival}}',
      festivalGreeting: 'Selamat {{festival}}!',
    },

    languages: {
      changeLanguage: 'Tukar Bahasa',
      currentLanguage: 'Semasa: {{language}}',
      malay: 'Bahasa Malaysia',
      english: 'Bahasa Inggeris',
      chinese: 'Bahasa Cina (Ringkas)',
      tamil: 'Bahasa Tamil',
      languageChanged: 'Bahasa ditukar kepada {{language}}',
    },
  },

  // Tetapan
  settings: {
    title: 'Tetapan',
    language: 'Bahasa',
    notifications: 'Pemberitahuan',
    privacy: 'Privasi',
    security: 'Keselamatan',
    cultural: 'Keutamaan Budaya',
    accessibility: 'Kebolehcapaian',
    
    cultural: {
      title: 'Keutamaan Budaya',
      prayerTimes: 'Waktu Solat',
      qiblaDirection: 'Arah Kiblat',
      halalValidation: 'Pengesahan Halal',
      festivalsCalendar: 'Kalendar Perayaan',
      languagePreferences: 'Keutamaan Bahasa',
      familyStructure: 'Struktur Keluarga',
    },

    accessibility: {
      title: 'Kebolehcapaian',
      largeText: 'Teks Besar',
      highContrast: 'Kontras Tinggi',
      voiceGuidance: 'Panduan Suara',
      hapticFeedback: 'Maklum Balas Haptik',
      elderlyMode: 'Mod Mesra Warga Emas',
      emergencyAccess: 'Akses Kecemasan Pantas',
    },
  },

  // Kecemasan
  emergency: {
    title: 'Kecemasan',
    call999: 'Panggil 999',
    hospitalNearby: 'Hospital Terdekat',
    pharmacyNearby: 'Farmasi Terdekat',
    emergencyContact: 'Kenalan Kecemasan',
    medicalInfo: 'Maklumat Perubatan',
    allergies: 'Alahan',
    currentMedications: 'Ubatan Semasa',
    medicalConditions: 'Keadaan Perubatan',
    emergencyNote: 'Dalam kes kecemasan, tunjukkan maklumat ini kepada kakitangan perubatan',
  },

  // Masa dan Tarikh
  time: {
    now: 'sekarang',
    today: 'hari ini',
    tomorrow: 'esok',
    yesterday: 'semalam',
    thisWeek: 'minggu ini',
    nextWeek: 'minggu depan',
    minute: 'minit',
    minutes: 'minit',
    hour: 'jam',
    hours: 'jam',
    day: 'hari',
    days: 'hari',
    week: 'minggu',
    weeks: 'minggu',
    month: 'bulan',
    months: 'bulan',
    year: 'tahun',
    years: 'tahun',
    ago: 'yang lalu',
    in: 'dalam',
  },

  // Mesej ralat
  errors: {
    networkError: 'Ralat sambungan rangkaian',
    serverError: 'Ralat pelayan berlaku',
    notFound: 'Item tidak dijumpai',
    unauthorized: 'Akses ditolak',
    forbidden: 'Operasi tidak dibenarkan',
    validationError: 'Sila semak input anda',
    medicationNotFound: 'Ubat tidak dijumpai',
    prayerTimeUnavailable: 'Waktu solat tidak tersedia untuk lokasi ini',
    locationPermissionDenied: 'Kebenaran lokasi diperlukan',
    cameraPermissionDenied: 'Kebenaran kamera diperlukan',
    unknown: 'Ralat tidak diketahui berlaku',
  },

  // Mesej kejayaan
  success: {
    medicationAdded: 'Ubat berjaya ditambah',
    medicationUpdated: 'Ubat berjaya dikemas kini',
    medicationDeleted: 'Ubat berjaya dipadam',
    reminderSet: 'Peringatan berjaya ditetapkan',
    profileUpdated: 'Profil berjaya dikemas kini',
    settingsSaved: 'Tetapan berjaya disimpan',
    familyMemberAdded: 'Ahli keluarga berjaya ditambah',
  },

  // Mesej pengesahan
  validation: {
    required: 'Medan ini diperlukan',
    invalidEmail: 'Alamat e-mel tidak sah',
    invalidPassword: 'Kata laluan mestilah sekurang-kurangnya 6 aksara',
    passwordMismatch: 'Kata laluan tidak sepadan',
    invalidDosage: 'Jumlah dos tidak sah',
    invalidTime: 'Format masa tidak sah',
    maxLength: 'Maksimum {{max}} aksara dibenarkan',
    minLength: 'Minimum {{min}} aksara diperlukan',
  },

  // Arahan ubat dengan konteks penjagaan kesihatan Malaysia
  instructions: {
    common: {
      withMeals: 'Ambil bersama makanan untuk mengurangkan gangguan perut',
      beforeMeals: 'Ambil 30 minit sebelum makan untuk penyerapan terbaik',
      afterMeals: 'Ambil selepas makan untuk membantu penghadaman',
      emptyStomach: 'Ambil pada perut kosong (1 jam sebelum atau 2 jam selepas makan)',
      beforeSleep: 'Ambil sebelum tidur',
      asNeeded: 'Ambil hanya apabila simptom berlaku',
      completeAllDoses: 'Habiskan semua dos walaupun berasa sihat',
      doNotCrush: 'Telan keseluruhan - jangan hancurkan atau kunyah',
      storeInFridge: 'Simpan dalam peti sejuk',
      avoidAlcohol: 'Jangan minum alkohol semasa mengambil ubat ini',
      avoidSunlight: 'Elakkan pendedahan matahari yang lama',
      drinkPlentyWater: 'Minum banyak air',
    },

    cultural: {
      ramadanAdjustment: 'Semasa Ramadan, laraskan masa kepada sebelum sahur atau selepas berbuka',
      prayerTimeBuffer: 'Berikan buffer 30 minit sebelum waktu solat',
      halalCertified: 'Ubat ini disahkan Halal',
      traditionalMedicineWarning: 'Berunding sebelum menggabungkan dengan ubat tradisional',
      familyMedicationSharing: 'Jangan berkongsi dengan ahli keluarga tanpa kelulusan doktor',
    },
  },
};

export default ms;