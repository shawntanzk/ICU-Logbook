export const SUPERVISION_LEVELS = ['direct', 'indirect', 'independent'] as const

export const ORGAN_SYSTEMS = [
  'Cardiovascular',
  'Respiratory',
  'Renal',
  'Neurological',
  'Gastrointestinal',
  'Haematological',
  'Endocrine/Metabolic',
  'Infectious',
  'Musculoskeletal',
  'Dermatological',
] as const

export const COBATRICE_DOMAINS = [
  '1. Professionalism',
  '2. Patient safety',
  '3. Medical expertise',
  '4. Clinical reasoning',
  '5. Communication',
  '6. Collaboration',
  '7. Management',
  '8. Education & research',
  '9. Perioperative care',
  '10. ICU procedures',
  '11. Organ system management',
  '12. Specific patient groups',
  '13. End of life care',
  '14. Transfer',
] as const

export const PROCEDURE_TYPES = [
  'Intubation',
  'Arterial Line',
  'Central Venous Catheter',
  'Chest Drain',
  'Lumbar Puncture',
  'Ultrasound',
  'Regional Block',
  'Bronchoscopy',
  'Tracheostomy',
  'Cardioversion',
  'Other',
] as const

export const AIRWAY_DEVICES = [
  'Direct laryngoscopy',
  'Video laryngoscopy',
  'Supraglottic airway',
  'Awake fibreoptic',
  'Surgical airway',
] as const

export const CVC_SITES = [
  'Right IJV',
  'Left IJV',
  'Right Subclavian',
  'Left Subclavian',
  'Right Femoral',
  'Left Femoral',
  'Other',
] as const

export const ARTERIAL_SITES = [
  'Right Radial',
  'Left Radial',
  'Right Femoral',
  'Left Femoral',
  'Right Brachial',
  'Left Brachial',
  'Other',
] as const

export const USS_STUDY_TYPES = [
  'Focused Echo (FATE/FEEL)',
  'Full Echo',
  'FAST',
  'eFAST',
  'Lung USS',
  'Vascular Access USS',
  'Other',
] as const

export const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia', 'Australia',
  'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Belarus', 'Belgium', 'Belize',
  'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei',
  'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Canada', 'Cape Verde',
  'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo',
  'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti',
  'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea',
  'Estonia', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany',
  'Ghana', 'Greece', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras',
  'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
  'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kosovo', 'Kuwait', 'Kyrgyzstan',
  'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania',
  'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Mauritania',
  'Mauritius', 'Mexico', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique',
  'Myanmar', 'Namibia', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria',
  'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palestine', 'Panama',
  'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar',
  'Romania', 'Russia', 'Rwanda', 'Saudi Arabia', 'Senegal', 'Serbia', 'Sierra Leone', 'Singapore',
  'Slovakia', 'Slovenia', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain',
  'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan',
  'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Trinidad and Tobago', 'Tunisia', 'Turkey',
  'Turkmenistan', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States',
  'Uruguay', 'Uzbekistan', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe',
]

export const PATIENT_SEX_OPTIONS = ['Male', 'Female', 'Other', 'Unknown']

export const LEVEL_OF_CARE_OPTIONS = ['Level 1', 'Level 2', 'Level 3']

export const OUTCOME_OPTIONS = ['Survived', 'Died', 'Unknown']

export const INVOLVEMENT_OPTIONS = [
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
  { value: 'procedure_only', label: 'Procedure only' },
]

export const REGIONAL_BLOCK_TYPES = [
  'Femoral nerve block',
  'Sciatic nerve block',
  'Brachial plexus block',
  'Interscalene block',
  'Supraclavicular block',
  'Infraclavicular block',
  'Axillary block',
  'Transversus abdominis plane block',
  'Rectus sheath block',
  'Epidural',
  'Spinal',
  'Combined spinal-epidural',
  'Other',
]

export const TRANSFER_TYPES = ['Intra-hospital', 'Inter-hospital', 'Repatriation']
export const TRANSFER_MODES = ['Road ambulance', 'Helicopter', 'Fixed-wing aircraft', 'Other']

export const PRESENTING_CATEGORIES = [
  'Medical',
  'Surgical',
  'Trauma',
  'Obstetric',
  'Paediatric',
  'Psychiatric',
  'Other',
]
