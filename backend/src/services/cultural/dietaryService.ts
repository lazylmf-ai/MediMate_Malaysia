/**
 * Malaysian Cultural Dietary Service
 * Manages Islamic, Buddhist, Hindu, and other cultural dietary restrictions
 * Provides dietary guidance for healthcare contexts
 */

export interface DietaryRestriction {
  id: string;
  name: string;
  name_ms: string;
  religion: string;
  category: 'forbidden' | 'discouraged' | 'conditional' | 'preferred';
  severity: 'strict' | 'moderate' | 'flexible';
  items: string[];
  alternatives: string[];
  medical_exceptions?: string[];
  cultural_context: string;
  healthcare_implications: string[];
}

export interface PatientDietaryProfile {
  user_id: string;
  religion?: string;
  dietary_preferences: string[];
  restrictions: DietaryRestriction[];
  medical_dietary_needs: string[];
  cultural_flexibility: 'strict' | 'moderate' | 'flexible';
  emergency_exemptions: boolean;
  special_occasions: {
    ramadan_fasting: boolean;
    vegetarian_days: string[];
    cultural_feast_days: string[];
  };
  updated_at: Date;
}

export interface DietaryValidation {
  is_suitable: boolean;
  concerns: string[];
  alternatives: string[];
  cultural_considerations: string[];
  medical_implications: string[];
  severity: 'critical' | 'moderate' | 'minor' | 'acceptable';
  recommendations: string[];
}

export interface MedicalDietInteraction {
  medication_name: string;
  food_interactions: {
    item: string;
    interaction_type: 'avoid' | 'timing' | 'reduce' | 'enhance';
    severity: 'critical' | 'moderate' | 'minor';
    description: string;
    cultural_alternatives?: string[];
  }[];
  dietary_timing_recommendations: string[];
  cultural_considerations: string[];
}

export class DietaryService {
  private restrictions: Map<string, DietaryRestriction> = new Map();
  private foodDatabase: Map<string, any> = new Map();
  private initialized = false;

  // Islamic dietary restrictions
  private readonly ISLAMIC_DIETARY_RULES: DietaryRestriction[] = [
    {
      id: 'islam_pork',
      name: 'Pork and Pork Products',
      name_ms: 'Daging Babi dan Produk Babi',
      religion: 'Islam',
      category: 'forbidden',
      severity: 'strict',
      items: [
        'pork', 'ham', 'bacon', 'sausage (pork)', 'lard', 'gelatin (pork)',
        'pepperoni', 'salami', 'prosciutto', 'pork chops'
      ],
      alternatives: [
        'halal beef', 'halal chicken', 'halal lamb', 'fish',
        'halal turkey', 'vegetarian alternatives'
      ],
      cultural_context: 'Strictly forbidden in Islam (haram)',
      healthcare_implications: [
        'Check medication gelatin sources',
        'Verify IV fluid and supplement ingredients',
        'Consider halal alternatives for nutritional needs'
      ]
    },
    {
      id: 'islam_alcohol',
      name: 'Alcohol and Alcoholic Beverages',
      name_ms: 'Alkohol dan Minuman Beralkohol',
      religion: 'Islam',
      category: 'forbidden',
      severity: 'strict',
      items: [
        'beer', 'wine', 'spirits', 'liqueurs', 'cooking wine',
        'alcohol-based extracts', 'alcoholic desserts'
      ],
      alternatives: [
        'fruit juices', 'halal non-alcoholic beverages', 'water',
        'herbal teas', 'coconut water'
      ],
      medical_exceptions: [
        'Alcohol-based medications when no alternative exists',
        'External use antiseptics',
        'Life-threatening situations with medical supervision'
      ],
      cultural_context: 'Forbidden in Islam with some medical exceptions',
      healthcare_implications: [
        'Check medication alcohol content',
        'Use alcohol-free antiseptics when possible',
        'Consider cultural sensitivity in prescription choices'
      ]
    },
    {
      id: 'islam_non_halal_meat',
      name: 'Non-Halal Meat and Poultry',
      name_ms: 'Daging dan Unggas Bukan Halal',
      religion: 'Islam',
      category: 'forbidden',
      severity: 'strict',
      items: [
        'non-halal beef', 'non-halal chicken', 'non-halal lamb',
        'meat from non-Islamic slaughter', 'carrion', 'blood products'
      ],
      alternatives: [
        'halal certified meat', 'halal certified poultry',
        'fish and seafood', 'vegetarian protein sources'
      ],
      cultural_context: 'Must be slaughtered according to Islamic law',
      healthcare_implications: [
        'Ensure hospital meal compliance',
        'Check nutritional supplement sources',
        'Consider protein alternatives for healing'
      ]
    }
  ];

  // Hindu dietary restrictions
  private readonly HINDU_DIETARY_RULES: DietaryRestriction[] = [
    {
      id: 'hindu_beef',
      name: 'Beef and Cow Products',
      name_ms: 'Daging Lembu dan Produk Lembu',
      religion: 'Hinduism',
      category: 'forbidden',
      severity: 'strict',
      items: [
        'beef', 'cow meat', 'beef broth', 'beef gelatin',
        'bovine-derived products', 'cow-based supplements'
      ],
      alternatives: [
        'chicken', 'fish', 'vegetarian protein',
        'plant-based alternatives', 'dairy products'
      ],
      cultural_context: 'Cows are considered sacred in Hinduism',
      healthcare_implications: [
        'Check medication gelatin sources',
        'Verify supplement ingredients',
        'Consider alternative protein sources'
      ]
    },
    {
      id: 'hindu_vegetarian',
      name: 'Vegetarian Preference',
      name_ms: 'Pilihan Vegetarian',
      religion: 'Hinduism',
      category: 'preferred',
      severity: 'moderate',
      items: [
        'all meat products', 'fish', 'eggs', 'meat-derived ingredients'
      ],
      alternatives: [
        'vegetables', 'fruits', 'dairy products', 'grains',
        'legumes', 'nuts', 'plant-based proteins'
      ],
      cultural_context: 'Many Hindus practice vegetarianism (ahimsa)',
      healthcare_implications: [
        'Ensure adequate protein intake',
        'Monitor B12 and iron levels',
        'Consider vegetarian supplement alternatives'
      ]
    }
  ];

  // Buddhist dietary restrictions  
  private readonly BUDDHIST_DIETARY_RULES: DietaryRestriction[] = [
    {
      id: 'buddhist_alcohol',
      name: 'Alcohol and Intoxicants',
      name_ms: 'Alkohol dan Bahan Memabukkan',
      religion: 'Buddhism',
      category: 'discouraged',
      severity: 'moderate',
      items: [
        'alcoholic beverages', 'intoxicating substances',
        'alcohol-based cooking ingredients'
      ],
      alternatives: [
        'herbal teas', 'fruit juices', 'water',
        'non-alcoholic beverages'
      ],
      medical_exceptions: [
        'Medically prescribed alcohol-based medications',
        'Emergency medical situations'
      ],
      cultural_context: 'Alcohol impedes mindfulness and spiritual development',
      healthcare_implications: [
        'Discuss alcohol-based medications',
        'Consider patient\'s level of practice',
        'Respect individual interpretation'
      ]
    },
    {
      id: 'buddhist_noble_vegetables',
      name: 'Noble Vegetables Restriction',
      name_ms: 'Sekatan Sayur-sayuran Mulia',
      religion: 'Buddhism',
      category: 'conditional',
      severity: 'flexible',
      items: [
        'garlic', 'onions', 'shallots', 'leeks', 'chives'
      ],
      alternatives: [
        'ginger', 'other herbs and spices',
        'alternative flavoring ingredients'
      ],
      cultural_context: 'Some Buddhist traditions avoid these as they may increase desires',
      healthcare_implications: [
        'Consider in meal planning',
        'Respect individual practice level',
        'Not universally observed'
      ]
    }
  ];

  /**
   * Initialize the dietary service
   */
  async initialize(): Promise<void> {
    console.log('🍽️ Initializing Malaysian Cultural Dietary Service...');
    
    try {
      await this.loadDietaryRestrictions();
      await this.loadFoodDatabase();
      
      this.initialized = true;
      console.log(`✅ Dietary Service initialized with ${this.restrictions.size} dietary restrictions`);
    } catch (error) {
      console.error('❌ Failed to initialize Dietary Service:', error);
      throw error;
    }
  }

  /**
   * Create or update patient dietary profile
   */
  async createPatientProfile(
    userId: string,
    religion?: string,
    dietaryPreferences?: string[],
    medicalDietaryNeeds?: string[],
    culturalFlexibility: PatientDietaryProfile['cultural_flexibility'] = 'moderate'
  ): Promise<PatientDietaryProfile> {
    if (!this.initialized) {
      throw new Error('Dietary Service not initialized');
    }

    const restrictions: DietaryRestriction[] = [];
    
    // Add religion-based restrictions
    if (religion) {
      for (const restriction of this.restrictions.values()) {
        if (restriction.religion.toLowerCase() === religion.toLowerCase()) {
          restrictions.push(restriction);
        }
      }
    }

    // Add preference-based restrictions
    if (dietaryPreferences) {
      for (const preference of dietaryPreferences) {
        const matchingRestrictions = Array.from(this.restrictions.values())
          .filter(r => r.name.toLowerCase().includes(preference.toLowerCase()));
        restrictions.push(...matchingRestrictions);
      }
    }

    return {
      user_id: userId,
      religion,
      dietary_preferences: dietaryPreferences || [],
      restrictions,
      medical_dietary_needs: medicalDietaryNeeds || [],
      cultural_flexibility: culturalFlexibility,
      emergency_exemptions: true, // Default to allowing medical exemptions
      special_occasions: {
        ramadan_fasting: religion?.toLowerCase() === 'islam',
        vegetarian_days: religion?.toLowerCase() === 'hinduism' ? ['monday', 'thursday'] : [],
        cultural_feast_days: []
      },
      updated_at: new Date()
    };
  }

  /**
   * Validate food/ingredient against dietary restrictions
   */
  async validateDietaryItem(
    item: string,
    patientProfile: PatientDietaryProfile
  ): Promise<DietaryValidation> {
    if (!this.initialized) {
      throw new Error('Dietary Service not initialized');
    }

    const itemLower = item.toLowerCase();
    const concerns: string[] = [];
    const alternatives: string[] = [];
    const culturalConsiderations: string[] = [];
    const medicalImplications: string[] = [];
    let severity: DietaryValidation['severity'] = 'acceptable';
    const recommendations: string[] = [];

    // Check against each restriction in patient profile
    for (const restriction of patientProfile.restrictions) {
      for (const restrictedItem of restriction.items) {
        if (itemLower.includes(restrictedItem.toLowerCase()) || 
            restrictedItem.toLowerCase().includes(itemLower)) {
          
          const concern = `${item} conflicts with ${restriction.name} (${restriction.religion})`;
          concerns.push(concern);
          
          // Add alternatives
          alternatives.push(...restriction.alternatives);
          
          // Set severity based on restriction category and patient flexibility
          if (restriction.category === 'forbidden' && patientProfile.cultural_flexibility !== 'flexible') {
            severity = 'critical';
          } else if (restriction.category === 'discouraged' && severity !== 'critical') {
            severity = 'moderate';
          } else if (restriction.category === 'conditional' && severity === 'acceptable') {
            severity = 'minor';
          }

          culturalConsiderations.push(restriction.cultural_context);
          medicalImplications.push(...restriction.healthcare_implications);

          // Check for medical exceptions
          if (restriction.medical_exceptions) {
            recommendations.push(`Medical exceptions may apply: ${restriction.medical_exceptions.join(', ')}`);
          }
        }
      }
    }

    // Emergency exemptions consideration
    if (severity === 'critical' && patientProfile.emergency_exemptions) {
      recommendations.push('Emergency medical exemptions may override dietary restrictions');
      culturalConsiderations.push('Consult with patient and religious advisor for emergency exceptions');
    }

    // Remove duplicates
    const uniqueAlternatives = [...new Set(alternatives)];
    const uniqueCulturalConsiderations = [...new Set(culturalConsiderations)];
    const uniqueMedicalImplications = [...new Set(medicalImplications)];

    return {
      is_suitable: concerns.length === 0,
      concerns,
      alternatives: uniqueAlternatives,
      cultural_considerations: uniqueCulturalConsiderations,
      medical_implications: uniqueMedicalImplications,
      severity,
      recommendations
    };
  }

  /**
   * Get medication-food interactions for cultural diets
   */
  async getMedicationDietInteraction(
    medicationName: string,
    patientProfile: PatientDietaryProfile
  ): Promise<MedicalDietInteraction> {
    // Common medication-food interactions database
    const medicationInteractions: Record<string, any> = {
      'warfarin': [
        {
          item: 'leafy greens',
          interaction_type: 'timing',
          severity: 'moderate',
          description: 'High vitamin K content may affect blood clotting',
          cultural_alternatives: ['consistent intake of green vegetables']
        }
      ],
      'metformin': [
        {
          item: 'alcohol',
          interaction_type: 'avoid',
          severity: 'critical',
          description: 'Increased risk of lactic acidosis',
          cultural_alternatives: ['halal non-alcoholic beverages']
        }
      ],
      'calcium_supplements': [
        {
          item: 'dairy_products',
          interaction_type: 'timing',
          severity: 'moderate',
          description: 'Space calcium supplements from dairy intake',
          cultural_alternatives: ['plant-based calcium sources', 'timing adjustment']
        }
      ]
    };

    const normalizedMedName = medicationName.toLowerCase().replace(/\s+/g, '_');
    const interactions = medicationInteractions[normalizedMedName] || [];

    // Add cultural-specific considerations
    const culturalConsiderations: string[] = [];
    
    if (patientProfile.religion === 'Islam') {
      culturalConsiderations.push('Ensure medication timing works with prayer schedule');
      culturalConsiderations.push('Consider Ramadan fasting adjustments if applicable');
    }
    
    if (patientProfile.religion === 'Hinduism' || patientProfile.dietary_preferences.includes('vegetarian')) {
      culturalConsiderations.push('Ensure adequate protein intake with vegetarian diet');
      culturalConsiderations.push('Monitor B12 and iron levels');
    }

    return {
      medication_name: medicationName,
      food_interactions: interactions,
      dietary_timing_recommendations: [
        'Take medication at consistent times',
        'Consider cultural meal timing patterns',
        'Adjust for religious fasting periods if applicable'
      ],
      cultural_considerations: culturalConsiderations
    };
  }

  /**
   * Get Ramadan fasting dietary guidance
   */
  async getRamadanDietaryGuidance(patientProfile: PatientDietaryProfile): Promise<{
    fasting_suitable: boolean;
    medical_exemptions: string[];
    nutritional_recommendations: string[];
    meal_timing_suggestions: string[];
    hydration_guidance: string[];
    supplement_adjustments: string[];
  }> {
    if (patientProfile.religion?.toLowerCase() !== 'islam') {
      return {
        fasting_suitable: false,
        medical_exemptions: ['Not applicable - patient is not Muslim'],
        nutritional_recommendations: [],
        meal_timing_suggestions: [],
        hydration_guidance: [],
        supplement_adjustments: []
      };
    }

    const medicalExemptions: string[] = [];
    const nutritionalRecommendations: string[] = [];
    const mealTimingSuggestions: string[] = [];
    const hydrationGuidance: string[] = [];
    const supplementAdjustments: string[] = [];

    // Check for medical conditions that may exempt from fasting
    const exemptingConditions = [
      'diabetes type 1', 'severe diabetes', 'pregnancy', 'breastfeeding',
      'chronic kidney disease', 'heart failure', 'severe anemia'
    ];

    for (const condition of exemptingConditions) {
      if (patientProfile.medical_dietary_needs.some(need => 
        need.toLowerCase().includes(condition.toLowerCase()))) {
        medicalExemptions.push(`${condition} may exempt from fasting - consult with healthcare provider`);
      }
    }

    // General Ramadan nutritional guidance
    nutritionalRecommendations.push(
      'Focus on complex carbohydrates for sustained energy',
      'Include adequate protein in suhur and iftar meals',
      'Consume plenty of fruits and vegetables',
      'Limit fried and very sweet foods',
      'Choose whole grains over refined grains'
    );

    mealTimingSuggestions.push(
      'Suhur (pre-dawn meal): 04:30 - 05:30',
      'Break fast with dates and water',
      'Main iftar meal: 19:30 - 20:30',
      'Light snack: 21:30 - 22:00',
      'Avoid heavy meals close to sleep'
    );

    hydrationGuidance.push(
      'Drink plenty of water between iftar and suhur',
      'Avoid caffeinated drinks that may cause dehydration',
      'Include hydrating foods like watermelon and cucumber',
      'Limit salt intake to reduce thirst during fasting'
    );

    supplementAdjustments.push(
      'Take vitamins with iftar or suhur meals',
      'Iron supplements may be better tolerated with evening meal',
      'Calcium supplements can be taken after iftar',
      'Consult healthcare provider for medication timing adjustments'
    );

    return {
      fasting_suitable: medicalExemptions.length === 0,
      medical_exemptions: medicalExemptions,
      nutritional_recommendations: nutritionalRecommendations,
      meal_timing_suggestions: mealTimingSuggestions,
      hydration_guidance: hydrationGuidance,
      supplement_adjustments: supplementAdjustments
    };
  }

  /**
   * Get culturally appropriate meal suggestions for hospital/clinic
   */
  async getCulturalMealSuggestions(
    patientProfile: PatientDietaryProfile,
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  ): Promise<{
    suitable_options: string[];
    avoid_completely: string[];
    preparation_notes: string[];
    cultural_considerations: string[];
  }> {
    const suitableOptions: string[] = [];
    const avoidCompletely: string[] = [];
    const preparationNotes: string[] = [];
    const culturalConsiderations: string[] = [];

    // Base suitable options for Malaysian healthcare context
    const baseSuitableOptions = {
      breakfast: ['porridge', 'bread', 'fruits', 'tea', 'milk'],
      lunch: ['rice', 'vegetables', 'soup', 'fruits'],
      dinner: ['rice', 'vegetables', 'soup', 'fruits'],
      snack: ['fruits', 'crackers', 'juice', 'yogurt']
    };

    suitableOptions.push(...baseSuitableOptions[mealType]);

    // Religion-specific modifications
    if (patientProfile.religion?.toLowerCase() === 'islam') {
      suitableOptions.push('halal chicken', 'fish', 'halal beef');
      avoidCompletely.push('pork', 'non-halal meat', 'alcohol-based ingredients');
      preparationNotes.push('Ensure halal certification', 'Use separate cooking utensils');
      culturalConsiderations.push('Prayer time considerations for meal timing');
    }

    if (patientProfile.religion?.toLowerCase() === 'hinduism') {
      if (patientProfile.dietary_preferences.includes('vegetarian')) {
        suitableOptions.push('dal', 'paneer', 'vegetarian curry');
        avoidCompletely.push('all meat products', 'fish', 'eggs');
      }
      avoidCompletely.push('beef', 'cow-derived products');
      culturalConsiderations.push('Consider vegetarian protein sources');
    }

    if (patientProfile.religion?.toLowerCase() === 'buddhism') {
      if (patientProfile.dietary_preferences.includes('vegetarian')) {
        suitableOptions.push('tofu', 'vegetable dishes', 'rice dishes');
        avoidCompletely.push('meat products');
      }
      // Some Buddhist traditions avoid certain vegetables
      if (patientProfile.cultural_flexibility === 'strict') {
        avoidCompletely.push('garlic', 'onions', 'strong-smelling vegetables');
      }
    }

    // Medical dietary needs
    for (const medicalNeed of patientProfile.medical_dietary_needs) {
      if (medicalNeed.toLowerCase().includes('diabetes')) {
        preparationNotes.push('Control carbohydrate portions', 'Avoid added sugars');
      }
      if (medicalNeed.toLowerCase().includes('hypertension')) {
        preparationNotes.push('Reduce sodium content', 'Use herbs instead of salt');
      }
    }

    return {
      suitable_options: [...new Set(suitableOptions)],
      avoid_completely: [...new Set(avoidCompletely)],
      preparation_notes: [...new Set(preparationNotes)],
      cultural_considerations: [...new Set(culturalConsiderations)]
    };
  }

  /**
   * Get dietary restrictions by religion
   */
  getDietaryRestrictionsByReligion(religion: string): DietaryRestriction[] {
    return Array.from(this.restrictions.values())
      .filter(r => r.religion.toLowerCase() === religion.toLowerCase());
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  // Private methods

  private async loadDietaryRestrictions(): Promise<void> {
    // Load all dietary rules
    const allRules = [
      ...this.ISLAMIC_DIETARY_RULES,
      ...this.HINDU_DIETARY_RULES,
      ...this.BUDDHIST_DIETARY_RULES
    ];

    for (const rule of allRules) {
      this.restrictions.set(rule.id, rule);
    }

    console.log(`🥗 Loaded ${allRules.length} dietary restrictions`);
  }

  private async loadFoodDatabase(): Promise<void> {
    // Mock food database - in production, load from comprehensive food database
    const mockFoods = [
      { name: 'chicken', category: 'protein', halal_when_certified: true },
      { name: 'beef', category: 'protein', halal_when_certified: true, hindu_acceptable: false },
      { name: 'pork', category: 'protein', halal: false },
      { name: 'fish', category: 'protein', generally_acceptable: true },
      { name: 'rice', category: 'carbohydrate', universally_acceptable: true }
    ];

    for (const food of mockFoods) {
      this.foodDatabase.set(food.name, food);
    }

    console.log(`🍯 Loaded ${mockFoods.length} food items in database`);
  }
}