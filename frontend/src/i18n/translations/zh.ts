/**
 * Chinese (Simplified) Translations for MediMate Malaysia
 * 
 * Complete localization for Chinese-speaking Malaysians with cultural context
 * for traditional Chinese medicine integration and Malaysian healthcare system.
 */

export const zh = {
  // 应用核心
  app: {
    name: 'MediMate',
    tagline: '您的健康，我们的优先',
    loading: '正在加载...',
    error: '发生错误',
    retry: '重试',
    confirm: '确认',
    cancel: '取消',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    close: '关闭',
    next: '下一个',
    previous: '上一个',
    done: '完成',
    ok: '确定',
    yes: '是',
    no: '否',
  },

  // 导航
  navigation: {
    home: '首页',
    medications: '药物',
    family: '家庭',
    profile: '个人资料',
    settings: '设置',
    help: '帮助',
    emergency: '紧急情况',
    back: '返回',
  },

  // 身份验证
  auth: {
    signIn: '登录',
    signUp: '注册',
    signOut: '登出',
    email: '电子邮箱',
    password: '密码',
    confirmPassword: '确认密码',
    forgotPassword: '忘记密码？',
    resetPassword: '重置密码',
    welcomeBack: '欢迎回来',
    createAccount: '创建新账户',
    invalidCredentials: '无效的邮箱或密码',
    accountCreated: '账户创建成功',
    passwordReset: '密码重置邮件已发送',
  },

  // 药物管理
  medications: {
    title: '药物',
    addMedication: '添加药物',
    myMedications: '我的药物',
    medicationName: '药物名称',
    dosage: '剂量',
    frequency: '频率',
    instructions: '用药指导',
    nextDose: '下次用药',
    takeMedication: '服药',
    skipDose: '跳过剂量',
    markAsTaken: '标记为已服用',
    
    // 马来西亚特定的药学术语
    pharmaceuticalTerms: {
      ubat: '药物/药品',
      dos: '剂量',
      kekerapan: '频率',
      arahan: '指导',
      sebelumMakan: '饭前',
      selepasMakan: '饭后',
      bersamaMakanan: '随餐',
      padaPerutKosong: '空腹',
      pagi: '上午',
      tengahari: '中午',
      petang: '下午',
      malam: '晚上',
      sebelumTidur: '睡前',
      mengikutKeperluan: '按需要',
    },

    // 马来西亚常见剂型
    dosageForms: {
      tablet: '片剂',
      capsule: '胶囊',
      syrup: '糖浆',
      suspension: '悬浮液',
      cream: '乳膏',
      ointment: '软膏',
      drops: '滴剂',
      injection: '注射液',
      inhaler: '吸入器',
      patch: '贴剂',
      suppository: '栓剂',
    },

    // 频率选项
    frequency: {
      onceDaily: '每日一次',
      twiceDaily: '每日两次 (BD)',
      threeTimes: '每日三次 (TDS)',
      fourTimes: '每日四次 (QDS)',
      asNeeded: '按需要 (PRN)',
      weekly: '每周',
      monthly: '每月',
      custom: '自定义时间表',
    },

    // 药物提醒
    reminders: {
      title: '用药提醒',
      timeForMedication: '该服用 {{medication}} 了',
      dosageReminder: '服用 {{dosage}} 的 {{medication}}',
      lateReminder: '您错过了 {{medication}} 的服药时间',
      prayerTimeConflict: '因 {{prayer}} 祈祷时间调整用药时间',
      ramadanAdjustment: '斋月禁食期间调整时间表',
    },

    // 文化和宗教考虑
    cultural: {
      halalCertified: '清真认证',
      halalStatus: '清真状态',
      halalChecking: '正在检查清真状态...',
      halalApproved: '由 {{authority}} 认证为清真',
      halalUnknown: '清真状态未知 - 请咨询药房',
      halalConcern: '可能含有非清真成分',
      prayerTimeAdjustment: '根据祈祷时间调整',
      ramadanSchedule: '斋月禁食时间表',
      festivalConsideration: '节庆期间调整',
    },
  },

  // 家庭管理
  family: {
    title: '家庭',
    addMember: '添加家庭成员',
    familyMembers: '家庭成员',
    memberName: '姓名',
    relationship: '关系',
    age: '年龄',
    
    relationships: {
      parent: '父母',
      spouse: '配偶',
      child: '子女',
      grandparent: '祖父母',
      grandchild: '孙辈',
      sibling: '兄弟姐妹',
      other: '其他',
    },

    // 马来西亚家庭结构考虑
    culturalFamily: {
      elderCare: '长者护理责任',
      multigenerational: '多代同堂家庭',
      primaryCaregiver: '主要护理者',
      familyMedicationSharing: '家庭用药协调',
      traditionalPractices: '传统健康习俗',
    },
  },

  // 文化和宗教功能
  cultural: {
    prayerTimes: {
      title: '祈祷时间',
      fajr: '晨礼 (黎明)',
      dhuhr: '晌礼 (正午)',
      asr: '晡礼 (下午)',
      maghrib: '昏礼 (日落)',
      isha: '宵礼 (夜晚)',
      nextPrayer: '下次祈祷',
      timeUntil: '{{time}} 后',
      prayerTimeNow: '现在是祈祷时间',
      adjustSchedule: '调整用药时间表',
      avoidPrayerTimes: '避开祈祷时间',
    },

    qibla: {
      title: '朝拜方向',
      direction: '朝拜方向为北偏 {{degrees}}°',
      accuracy: '精度：{{accuracy}}m',
      calibrate: '校准指南针',
      locationPermission: '需要位置权限',
    },

    festivals: {
      ramadan: '斋月',
      eid: '开斋节',
      eidAdha: '宰牲节',
      chineseNewYear: '农历新年',
      deepavali: '屠妖节',
      christmas: '圣诞节',
      wesak: '卫塞节',
      adjustForFestival: '为 {{festival}} 调整时间表',
      festivalGreeting: '{{festival}} 快乐！',
    },

    languages: {
      changeLanguage: '更改语言',
      currentLanguage: '当前：{{language}}',
      malay: '马来语',
      english: '英语',
      chinese: '中文（简体）',
      tamil: '泰米尔语',
      languageChanged: '语言已更改为 {{language}}',
    },
  },

  // 设置
  settings: {
    title: '设置',
    language: '语言',
    notifications: '通知',
    privacy: '隐私',
    security: '安全',
    cultural: '文化偏好',
    accessibility: '无障碍',
    
    cultural: {
      title: '文化偏好',
      prayerTimes: '祈祷时间',
      qiblaDirection: '朝拜方向',
      halalValidation: '清真验证',
      festivalsCalendar: '节庆日历',
      languagePreferences: '语言偏好',
      familyStructure: '家庭结构',
    },

    accessibility: {
      title: '无障碍',
      largeText: '大字体',
      highContrast: '高对比度',
      voiceGuidance: '语音指导',
      hapticFeedback: '触觉反馈',
      elderlyMode: '长者友好模式',
      emergencyAccess: '快速紧急访问',
    },
  },

  // 紧急情况
  emergency: {
    title: '紧急情况',
    call999: '拨打 999',
    hospitalNearby: '附近医院',
    pharmacyNearby: '附近药房',
    emergencyContact: '紧急联系人',
    medicalInfo: '医疗信息',
    allergies: '过敏史',
    currentMedications: '目前用药',
    medicalConditions: '疾病史',
    emergencyNote: '紧急情况下，请向医护人员出示此信息',
  },

  // 时间和日期
  time: {
    now: '现在',
    today: '今天',
    tomorrow: '明天',
    yesterday: '昨天',
    thisWeek: '本周',
    nextWeek: '下周',
    minute: '分钟',
    minutes: '分钟',
    hour: '小时',
    hours: '小时',
    day: '天',
    days: '天',
    week: '周',
    weeks: '周',
    month: '月',
    months: '月',
    year: '年',
    years: '年',
    ago: '前',
    in: '后',
  },

  // 错误消息
  errors: {
    networkError: '网络连接错误',
    serverError: '服务器错误',
    notFound: '未找到项目',
    unauthorized: '访问被拒绝',
    forbidden: '操作不被允许',
    validationError: '请检查您的输入',
    medicationNotFound: '未找到药物',
    prayerTimeUnavailable: '此位置的祈祷时间不可用',
    locationPermissionDenied: '需要位置权限',
    cameraPermissionDenied: '需要相机权限',
    unknown: '发生未知错误',
  },

  // 成功消息
  success: {
    medicationAdded: '药物添加成功',
    medicationUpdated: '药物更新成功',
    medicationDeleted: '药物删除成功',
    reminderSet: '提醒设置成功',
    profileUpdated: '个人资料更新成功',
    settingsSaved: '设置保存成功',
    familyMemberAdded: '家庭成员添加成功',
  },

  // 验证消息
  validation: {
    required: '此字段为必填项',
    invalidEmail: '无效的邮箱地址',
    invalidPassword: '密码至少需要6个字符',
    passwordMismatch: '密码不匹配',
    invalidDosage: '无效的剂量',
    invalidTime: '无效的时间格式',
    maxLength: '最多允许 {{max}} 个字符',
    minLength: '至少需要 {{min}} 个字符',
  },

  // 具有马来西亚医疗保健背景的用药指导
  instructions: {
    common: {
      withMeals: '随餐服用以减少胃部不适',
      beforeMeals: '饭前30分钟服用以获得最佳吸收',
      afterMeals: '饭后服用以助消化',
      emptyStomach: '空腹服用（饭前1小时或饭后2小时）',
      beforeSleep: '睡前服用',
      asNeeded: '仅在出现症状时服用',
      completeAllDoses: '即使感觉好转也要完成整个疗程',
      doNotCrush: '整片吞服 - 不要咀嚼或压碎',
      storeInFridge: '冷藏保存',
      avoidAlcohol: '服用此药物期间不要饮酒',
      avoidSunlight: '避免长时间日照',
      drinkPlentyWater: '多喝水',
    },

    cultural: {
      ramadanAdjustment: '斋月期间，调整至封斋前或开斋后服用',
      prayerTimeBuffer: '祈祷时间前留出30分钟缓冲时间',
      halalCertified: '此药物已获清真认证',
      traditionalMedicineWarning: '与传统中药合用前请咨询医生',
      familyMedicationSharing: '未经医生同意不要与家庭成员分享',
    },
  },
};

export default zh;