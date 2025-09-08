/**
 * Local Medication Model
 * Manages Malaysian-specific medication data with cultural and regulatory considerations
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LocalMedication = sequelize.define('LocalMedication', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    medicationId: {
      type: DataTypes.STRING(100),
      unique: true,
      allowNull: false,
      field: 'medication_id'
    },
    genericName: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'generic_name'
    },
    brandNames: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      field: 'brand_names',
      comment: 'Malaysian brand names'
    },
    dosageForms: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      field: 'dosage_forms',
      comment: 'Available dosage forms in Malaysia'
    },
    strengths: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      comment: 'Available strengths in Malaysia'
    },
    therapeuticClass: {
      type: DataTypes.STRING(200),
      field: 'therapeutic_class'
    },
    isHalal: {
      type: DataTypes.BOOLEAN,
      field: 'is_halal',
      comment: 'Halal certification status'
    },
    halalCertification: {
      type: DataTypes.STRING(100),
      field: 'halal_certification',
      comment: 'Halal certification body'
    },
    isOtc: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_otc',
      comment: 'Over-the-counter availability'
    },
    prescriptionRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'prescription_required'
    },
    availabilityStatus: {
      type: DataTypes.STRING(50),
      defaultValue: 'available',
      field: 'availability_status',
      validate: {
        isIn: [['widely_available', 'available', 'limited', 'hospital_pharmacy', 'discontinued', 'out_of_stock']]
      }
    },
    manufacturer: {
      type: DataTypes.STRING(200)
    },
    registrationNumber: {
      type: DataTypes.STRING(100),
      field: 'registration_number',
      comment: 'Malaysian drug registration number'
    },
    culturalNotes: {
      type: DataTypes.TEXT,
      field: 'cultural_notes',
      comment: 'Cultural considerations for Malaysian patients'
    },
    dietaryRestrictions: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      field: 'dietary_restrictions',
      comment: 'Dietary restrictions and considerations'
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    }
  }, {
    tableName: 'malaysian_medications',
    timestamps: false,
    indexes: [
      {
        fields: ['generic_name']
      },
      {
        fields: ['therapeutic_class']
      },
      {
        fields: ['is_halal']
      },
      {
        fields: ['availability_status']
      },
      {
        fields: ['is_otc']
      }
    ]
  });

  // Instance methods
  LocalMedication.prototype.getDisplayName = function(preferBrandName = true) {
    if (preferBrandName && this.brandNames && this.brandNames.length > 0) {
      return `${this.brandNames[0]} (${this.genericName})`;
    }
    return this.genericName;
  };

  LocalMedication.prototype.getAllBrandNames = function() {
    return this.brandNames || [];
  };

  LocalMedication.prototype.isAvailableOtc = function() {
    return this.isOtc && ['widely_available', 'available'].includes(this.availabilityStatus);
  };

  LocalMedication.prototype.getHalalStatus = function() {
    if (this.isHalal === null) {
      return {
        status: 'unknown',
        message: 'Halal status not verified. Please consult with pharmacist or religious authority.',
        certification: null
      };
    }
    
    if (this.isHalal) {
      return {
        status: 'halal',
        message: 'This medication is certified Halal and suitable for Muslim patients.',
        certification: this.halalCertification
      };
    }
    
    return {
      status: 'not_halal',
      message: 'This medication may contain non-Halal ingredients. Consult with religious authority if needed.',
      certification: null
    };
  };

  LocalMedication.prototype.getCulturalConsiderations = function() {
    const considerations = [];
    
    // Halal considerations
    const halalStatus = this.getHalalStatus();
    if (halalStatus.status !== 'halal') {
      considerations.push({
        type: 'religious',
        community: 'Muslim',
        note: halalStatus.message
      });
    }

    // Dietary restrictions
    if (this.dietaryRestrictions && this.dietaryRestrictions.length > 0) {
      this.dietaryRestrictions.forEach(restriction => {
        switch (restriction) {
          case 'take_with_meals':
            considerations.push({
              type: 'dietary',
              community: 'All',
              note: 'Should be taken with food. During Ramadan fasting, timing may need adjustment.'
            });
            break;
          case 'avoid_alcohol':
            considerations.push({
              type: 'religious',
              community: 'Muslim',
              note: 'This medication interacts with alcohol. Muslim patients should ensure no alcohol in preparation.'
            });
            break;
          case 'take_at_bedtime':
            considerations.push({
              type: 'timing',
              community: 'All',
              note: 'Best taken at bedtime. Consider prayer times for optimal scheduling.'
            });
            break;
        }
      });
    }

    // Add custom cultural notes
    if (this.culturalNotes) {
      considerations.push({
        type: 'cultural',
        community: 'Malaysian',
        note: this.culturalNotes
      });
    }

    return considerations;
  };

  LocalMedication.prototype.getAvailabilityInfo = function() {
    const availability = {
      status: this.availabilityStatus,
      description: '',
      prescription_needed: this.prescriptionRequired,
      otc_available: this.isOtc
    };

    switch (this.availabilityStatus) {
      case 'widely_available':
        availability.description = 'Available at most pharmacies across Malaysia';
        break;
      case 'available':
        availability.description = 'Available at pharmacies, may need to check with local pharmacy';
        break;
      case 'limited':
        availability.description = 'Limited availability, may need to order from specific pharmacies';
        break;
      case 'hospital_pharmacy':
        availability.description = 'Available only at hospital pharmacies or specialist clinics';
        break;
      case 'discontinued':
        availability.description = 'No longer available in Malaysia, alternative needed';
        break;
      case 'out_of_stock':
        availability.description = 'Temporarily out of stock, check back later';
        break;
    }

    return availability;
  };

  // Class methods
  LocalMedication.searchByName = function(searchTerm) {
    return this.findAll({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { genericName: { [sequelize.Sequelize.Op.iLike]: `%${searchTerm}%` } },
          { brandNames: { [sequelize.Sequelize.Op.overlap]: [searchTerm] } }
        ]
      },
      order: [['genericName', 'ASC']]
    });
  };

  LocalMedication.findHalalMedications = function() {
    return this.findAll({
      where: {
        isHalal: true
      },
      order: [['genericName', 'ASC']]
    });
  };

  LocalMedication.findByTherapeuticClass = function(therapeuticClass) {
    return this.findAll({
      where: {
        therapeuticClass: {
          [sequelize.Sequelize.Op.iLike]: `%${therapeuticClass}%`
        }
      },
      order: [['genericName', 'ASC']]
    });
  };

  LocalMedication.findOtcMedications = function() {
    return this.findAll({
      where: {
        isOtc: true,
        availabilityStatus: {
          [sequelize.Sequelize.Op.in]: ['widely_available', 'available']
        }
      },
      order: [['genericName', 'ASC']]
    });
  };

  LocalMedication.findByAvailability = function(availabilityStatus) {
    return this.findAll({
      where: {
        availabilityStatus
      },
      order: [['genericName', 'ASC']]
    });
  };

  LocalMedication.findAlternatives = function(genericName, excludeId = null) {
    const whereCondition = {
      [sequelize.Sequelize.Op.or]: [
        { genericName: { [sequelize.Sequelize.Op.iLike]: `%${genericName}%` } },
        { brandNames: { [sequelize.Sequelize.Op.overlap]: [genericName] } }
      ],
      availabilityStatus: {
        [sequelize.Sequelize.Op.notIn]: ['discontinued', 'out_of_stock']
      }
    };

    if (excludeId) {
      whereCondition.id = { [sequelize.Sequelize.Op.ne]: excludeId };
    }

    return this.findAll({
      where: whereCondition,
      order: [
        ['availabilityStatus', 'ASC'], // widely_available first
        ['genericName', 'ASC']
      ]
    });
  };

  LocalMedication.getMedicationsByBrand = function(brandName) {
    return this.findAll({
      where: {
        brandNames: { [sequelize.Sequelize.Op.contains]: [brandName] }
      },
      order: [['genericName', 'ASC']]
    });
  };

  LocalMedication.getStatistics = async function() {
    const stats = await Promise.all([
      this.count(),
      this.count({ where: { isHalal: true } }),
      this.count({ where: { isOtc: true } }),
      this.count({ where: { availabilityStatus: 'widely_available' } }),
      this.count({ where: { prescriptionRequired: true } })
    ]);

    return {
      total_medications: stats[0],
      halal_certified: stats[1],
      otc_available: stats[2],
      widely_available: stats[3],
      prescription_required: stats[4],
      halal_percentage: stats[0] > 0 ? ((stats[1] / stats[0]) * 100).toFixed(1) : 0
    };
  };

  // Validation methods
  LocalMedication.prototype.validateMalaysianStandards = function() {
    const issues = [];

    // Check registration number format (simplified check)
    if (this.registrationNumber && !this.registrationNumber.match(/^MAL\d{8}[A-Z]$/)) {
      issues.push('Registration number does not match Malaysian format (MALxxxxxxxxX)');
    }

    // Check availability consistency
    if (this.isOtc && this.availabilityStatus === 'hospital_pharmacy') {
      issues.push('OTC medication should not be limited to hospital pharmacies');
    }

    // Check halal certification
    if (this.isHalal && !this.halalCertification) {
      issues.push('Halal status is true but no certification body specified');
    }

    return {
      isValid: issues.length === 0,
      issues: issues
    };
  };

  return LocalMedication;
};