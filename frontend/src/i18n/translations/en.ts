/**
 * English Translations for MediMate Malaysia
 * 
 * Complete localization for English speakers with cultural context
 * for Malaysian healthcare system and medication management.
 */

export const en = {
  // Application Core
  app: {
    name: 'MediMate',
    tagline: 'Your Health, Our Priority',
    loading: 'Loading...',
    error: 'An error occurred',
    retry: 'Try Again',
    confirm: 'Confirm',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    next: 'Next',
    previous: 'Previous',
    done: 'Done',
    ok: 'OK',
    yes: 'Yes',
    no: 'No',
  },

  // Navigation
  navigation: {
    home: 'Home',
    medications: 'Medications',
    family: 'Family',
    profile: 'Profile',
    settings: 'Settings',
    help: 'Help',
    emergency: 'Emergency',
    back: 'Back',
  },

  // Authentication
  auth: {
    signIn: 'Sign In',
    signUp: 'Sign Up',
    signOut: 'Sign Out',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    forgotPassword: 'Forgot Password?',
    resetPassword: 'Reset Password',
    welcomeBack: 'Welcome back',
    createAccount: 'Create new account',
    invalidCredentials: 'Invalid email or password',
    accountCreated: 'Account created successfully',
    passwordReset: 'Password reset email sent',
  },

  // Medication Management
  medications: {
    title: 'Medications',
    addMedication: 'Add Medication',
    myMedications: 'My Medications',
    medicationName: 'Medication Name',
    dosage: 'Dosage',
    frequency: 'Frequency',
    instructions: 'Instructions',
    nextDose: 'Next Dose',
    takeMedication: 'Take Medication',
    skipDose: 'Skip Dose',
    markAsTaken: 'Mark as Taken',
    
    // Malaysian-specific pharmaceutical terms
    pharmaceuticalTerms: {
      ubat: 'Medicine/Medication',
      dos: 'Dose',
      kekerapan: 'Frequency',
      arahan: 'Instructions',
      sebelumMakan: 'Before meals',
      selepassMakan: 'After meals',
      bersamaMakanan: 'With meals',
      padaPerutKosong: 'On empty stomach',
      pagi: 'Morning',
      tengahari: 'Afternoon', 
      petang: 'Evening',
      malam: 'Night',
      sebelumTidur: 'Before sleep',
      mengikutKeperluan: 'As needed',
    },

    // Dosage forms common in Malaysia
    dosageForms: {
      tablet: 'Tablet',
      capsule: 'Capsule', 
      syrup: 'Syrup',
      suspension: 'Suspension',
      cream: 'Cream',
      ointment: 'Ointment',
      drops: 'Drops',
      injection: 'Injection',
      inhaler: 'Inhaler',
      patch: 'Patch',
      suppository: 'Suppository',
    },

    // Frequency options
    frequency: {
      onceDaily: 'Once daily',
      twiceDaily: 'Twice daily (BD)',
      threeTimes: 'Three times daily (TDS)',
      fourTimes: 'Four times daily (QDS)',
      asNeeded: 'As needed (PRN)',
      weekly: 'Weekly',
      monthly: 'Monthly',
      custom: 'Custom schedule',
    },

    // Medication reminders
    reminders: {
      title: 'Medication Reminders',
      timeForMedication: "It's time for your {{medication}}",
      dosageReminder: 'Take {{dosage}} of {{medication}}',
      lateReminder: 'You have a missed dose of {{medication}}',
      prayerTimeConflict: 'Medication time adjusted due to {{prayer}} prayer',
      ramadanAdjustment: 'Schedule adjusted for Ramadan fasting',
    },

    // Cultural and religious considerations
    cultural: {
      halalCertified: 'Halal Certified',
      halalStatus: 'Halal Status',
      halalChecking: 'Checking Halal status...',
      halalApproved: 'Halal certified by {{authority}}',
      halalUnknown: 'Halal status unknown - please consult pharmacy',
      halalConcern: 'May contain non-halal ingredients',
      prayerTimeAdjustment: 'Adjusted for prayer times',
      ramadanSchedule: 'Ramadan fasting schedule',
      festivalConsideration: 'Festival period adjustment',
    },
  },

  // Family Management
  family: {
    title: 'Family',
    addMember: 'Add Family Member',
    familyMembers: 'Family Members',
    memberName: 'Name',
    relationship: 'Relationship',
    age: 'Age',
    
    relationships: {
      parent: 'Parent',
      spouse: 'Spouse',
      child: 'Child',
      grandparent: 'Grandparent',
      grandchild: 'Grandchild',
      sibling: 'Sibling',
      other: 'Other',
    },

    // Malaysian family structure considerations
    culturalFamily: {
      elderCare: 'Elder care responsibilities',
      multigenerational: 'Multi-generational household',
      primaryCaregiver: 'Primary caregiver',
      familyMedicationSharing: 'Family medication coordination',
      traditionalPractices: 'Traditional health practices',
    },
  },

  // Cultural & Religious Features
  cultural: {
    prayerTimes: {
      title: 'Prayer Times',
      fajr: 'Fajr (Dawn)',
      dhuhr: 'Dhuhr (Midday)', 
      asr: 'Asr (Afternoon)',
      maghrib: 'Maghrib (Sunset)',
      isha: 'Isha (Night)',
      nextPrayer: 'Next prayer',
      timeUntil: 'in {{time}}',
      prayerTimeNow: 'Prayer time now',
      adjustSchedule: 'Adjust medication schedule',
      avoidPrayerTimes: 'Avoid prayer times',
    },

    qibla: {
      title: 'Qibla Direction',
      direction: 'Qibla is {{degrees}}° from North',
      accuracy: 'Accuracy: {{accuracy}}m',
      calibrate: 'Calibrate compass',
      locationPermission: 'Location permission required',
    },

    festivals: {
      ramadan: 'Ramadan',
      eid: 'Eid al-Fitr',
      eidAdha: 'Eid al-Adha',
      chineseNewYear: 'Chinese New Year',
      deepavali: 'Deepavali',
      christmas: 'Christmas',
      wesak: 'Wesak Day',
      adjustForFestival: 'Adjust schedule for {{festival}}',
      festivalGreeting: 'Happy {{festival}}!',
    },

    languages: {
      changeLanguage: 'Change Language',
      currentLanguage: 'Current: {{language}}',
      malay: 'Bahasa Malaysia',
      english: 'English',
      chinese: 'Chinese (Simplified)',
      tamil: 'Tamil',
      languageChanged: 'Language changed to {{language}}',
    },
  },

  // Settings
  settings: {
    title: 'Settings',
    language: 'Language',
    notifications: 'Notifications',
    privacy: 'Privacy',
    security: 'Security',
    cultural: 'Cultural Preferences',
    accessibility: 'Accessibility',
    
    cultural: {
      title: 'Cultural Preferences',
      prayerTimes: 'Prayer Times',
      qiblaDirection: 'Qibla Direction',
      halalValidation: 'Halal Validation',
      festivalsCalendar: 'Festivals Calendar',
      languagePreferences: 'Language Preferences',
      familyStructure: 'Family Structure',
    },

    accessibility: {
      title: 'Accessibility',
      largeText: 'Large Text',
      highContrast: 'High Contrast',
      voiceGuidance: 'Voice Guidance',
      hapticFeedback: 'Haptic Feedback',
      elderlyMode: 'Elderly-Friendly Mode',
      emergencyAccess: 'Quick Emergency Access',
    },
  },

  // Emergency
  emergency: {
    title: 'Emergency',
    call999: 'Call 999',
    hospitalNearby: 'Nearest Hospital',
    pharmacyNearby: 'Nearest Pharmacy',
    emergencyContact: 'Emergency Contact',
    medicalInfo: 'Medical Information',
    allergies: 'Allergies',
    currentMedications: 'Current Medications',
    medicalConditions: 'Medical Conditions',
    emergencyNote: 'In case of emergency, show this information to medical personnel',
  },

  // Time and Date
  time: {
    now: 'now',
    today: 'today',
    tomorrow: 'tomorrow',
    yesterday: 'yesterday',
    thisWeek: 'this week',
    nextWeek: 'next week',
    minute: 'minute',
    minutes: 'minutes',
    hour: 'hour',
    hours: 'hours',
    day: 'day',
    days: 'days',
    week: 'week',
    weeks: 'weeks',
    month: 'month',
    months: 'months',
    year: 'year',
    years: 'years',
    ago: 'ago',
    in: 'in',
  },

  // Error messages
  errors: {
    networkError: 'Network connection error',
    serverError: 'Server error occurred',
    notFound: 'Item not found',
    unauthorized: 'Access denied',
    forbidden: 'Operation not allowed',
    validationError: 'Please check your input',
    medicationNotFound: 'Medication not found',
    prayerTimeUnavailable: 'Prayer times unavailable for this location',
    locationPermissionDenied: 'Location permission required',
    cameraPermissionDenied: 'Camera permission required',
    unknown: 'Unknown error occurred',
  },

  // Success messages
  success: {
    medicationAdded: 'Medication added successfully',
    medicationUpdated: 'Medication updated successfully',
    medicationDeleted: 'Medication deleted successfully',
    reminderSet: 'Reminder set successfully',
    profileUpdated: 'Profile updated successfully',
    settingsSaved: 'Settings saved successfully',
    familyMemberAdded: 'Family member added successfully',
  },

  // Validation messages
  validation: {
    required: 'This field is required',
    invalidEmail: 'Invalid email address',
    invalidPassword: 'Password must be at least 6 characters',
    passwordMismatch: 'Passwords do not match',
    invalidDosage: 'Invalid dosage amount',
    invalidTime: 'Invalid time format',
    maxLength: 'Maximum {{max}} characters allowed',
    minLength: 'Minimum {{min}} characters required',
  },

  // Medication instructions with Malaysian healthcare context
  instructions: {
    common: {
      withMeals: 'Take with meals to reduce stomach upset',
      beforeMeals: 'Take 30 minutes before meals for best absorption',
      afterMeals: 'Take after meals to aid digestion',
      emptyStomach: 'Take on empty stomach (1 hour before or 2 hours after meals)',
      beforeSleep: 'Take before bedtime',
      asNeeded: 'Take only when symptoms occur',
      completeAllDoses: 'Complete the full course even if you feel better',
      doNotCrush: 'Swallow whole - do not crush or chew',
      storeInFridge: 'Store in refrigerator',
      avoidAlcohol: 'Do not consume alcohol while taking this medication',
      avoidSunlight: 'Avoid prolonged sun exposure',
      drinkPlentyWater: 'Drink plenty of water',
    },

    cultural: {
      ramadanAdjustment: 'During Ramadan, adjust timing to before Sahur or after Iftar',
      prayerTimeBuffer: 'Allow 30 minutes buffer before prayer times',
      halalCertified: 'This medication is certified Halal',
      traditionalMedicineWarning: 'Consult before combining with traditional medicine',
      familyMedicationSharing: 'Do not share with family members without doctor approval',
    },
  },
};

export type TranslationKey = typeof en;
export default en;