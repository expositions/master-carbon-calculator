// countrygroups.js
// Pure ES module: usable in both browser and server environments.

const SOUTH_AMERICA = [
  "ARG", // Argentina
  "BOL", // Bolivia
  "BRA", // Brazil
  "CHL", // Chile
  "COL", // Colombia
  "ECU", // Ecuador
  "GUY", // Guyana
  "PRY", // Paraguay
  "PER", // Peru
  "SUR", // Suriname
  "URY", // Uruguay
  "VEN"  // Venezuela
];

const CENTRAL_AMERICA = [
    "BLZ", // Belize
    "CRI", // Costa Rica
    "SLV", // El Salvador
    "GTM", // Guatemala
    "HND", // Honduras
    "NIC", // Nicaragua
    "PAN"  // Panama
];

const NORTH_AMERICA = [
    // Mainland North America
    "CAN", // Canada
    "USA", // United States
    "MEX", // Mexico

    "BMU", // Bermuda (UK Territory)
    "GRL",  // Greenland (Denmark, but geographically NA)

    // Central American countries (sometimes grouped with North America)
    "BLZ", // Belize
    "CRI", // Costa Rica
    "SLV", // El Salvador
    "GTM", // Guatemala
    "HND", // Honduras
    "NIC", // Nicaragua
    "PAN", // Panama
  
    // Caribbean nations
    "ATG", // Antigua and Barbuda
    "BHS", // Bahamas
    "BRB", // Barbados
    "CUB", // Cuba
    "DMA", // Dominica
    "DOM", // Dominican Republic
    "GRD", // Grenada
    "HTI", // Haiti
    "JAM", // Jamaica
    "KNA", // Saint Kitts and Nevis
    "LCA", // Saint Lucia
    "VCT", // Saint Vincent and the Grenadines
    "TTO", // Trinidad and Tobago
];
  

const CARIBBEAN = [
    "ATG", // Antigua and Barbuda
    "BHS", // Bahamas
    "BRB", // Barbados
    "CUB", // Cuba
    "DMA", // Dominica
    "DOM", // Dominican Republic
    "GRD", // Grenada
    "HTI", // Haiti
    "JAM", // Jamaica
    "KNA", // Saint Kitts and Nevis
    "LCA", // Saint Lucia
    "VCT", // Saint Vincent and the Grenadines
    "TTO", // Trinidad and Tobago
];

const AFRICA = [
    // Northern Africa
    "DZA", // Algeria
    "EGY", // Egypt
    "LBY", // Libya
    "MAR", // Morocco
    "SDN", // Sudan
    "SSD", // South Sudan
    "TUN", // Tunisia
    "ESH", // Western Sahara (Disputed Territory)
  
    // West Africa
    "BEN", // Benin
    "BFA", // Burkina Faso
    "CPV", // Cape Verde
    "CIV", // Côte d'Ivoire
    "GMB", // Gambia
    "GHA", // Ghana
    "GIN", // Guinea
    "GNB", // Guinea-Bissau
    "LBR", // Liberia
    "MLI", // Mali
    "MRT", // Mauritania
    "NER", // Niger
    "NGA", // Nigeria
    "SEN", // Senegal
    "SLE", // Sierra Leone
    "TGO", // Togo
  
    // Central Africa
    "AGO", // Angola
    "CMR", // Cameroon
    "CAF", // Central African Republic
    "TCD", // Chad
    "COG", // Republic of the Congo
    "COD", // Democratic Republic of the Congo
    "GNQ", // Equatorial Guinea
    "GAB", // Gabon
    "STP", // São Tomé and Príncipe
  
    // East Africa
    "BDI", // Burundi
    "COM", // Comoros
    "DJI", // Djibouti
    "ERI", // Eritrea
    "ETH", // Ethiopia
    "KEN", // Kenya
    "MDG", // Madagascar
    "MWI", // Malawi
    "MUS", // Mauritius
    "MOZ", // Mozambique
    "RWA", // Rwanda
    "SYC", // Seychelles
    "SOM", // Somalia
    "TZA", // Tanzania
    "UGA", // Uganda
    "ZMB", // Zambia
    "ZWE", // Zimbabwe
  
    // Southern Africa
    "BWA", // Botswana
    "LSO", // Lesotho
    "NAM", // Namibia
    "ZAF", // South Africa
    "SWZ", // Eswatini (Swaziland)
  
    // African territories (not sovereign states but often included)
    "MYT", // Mayotte (French territory)
    "REU"  // Réunion (French territory)
];

const OCEANIA = [
    // Australia & New Zealand
    "AUS", // Australia
    "NZL", // New Zealand
  
    // Melanesia
    "FJI", // Fiji
    "PNG", // Papua New Guinea
    "SLB", // Solomon Islands
    "VUT", // Vanuatu
  
    // Micronesia
    "FSM", // Federated States of Micronesia
    "GUM", // Guam (US territory)
    "KIR", // Kiribati
    "MHL", // Marshall Islands
    "NRU", // Nauru
    "PLW", // Palau
    "TUV", // Tuvalu
  
    // Polynesia
    "ASM", // American Samoa (US territory)
    "COK", // Cook Islands
    "NIU", // Niue
    "PYF", // French Polynesia (French territory)
    "PCN", // Pitcairn Islands (UK territory)
    "WSM", // Samoa
    "TKL", // Tokelau (New Zealand territory)
    "TON", // Tonga
  
    // Other Territories
    "NCL", // New Caledonia (French territory)
    "WLF"  // Wallis and Futuna (French territory)
];

const ASIA = [
    // Central Asia
    "KAZ", // Kazakhstan
    "KGZ", // Kyrgyzstan
    "TJK", // Tajikistan
    "TKM", // Turkmenistan
    "UZB", // Uzbekistan
  
    // East Asia
    "CHN", // China
    "HKG", // Hong Kong (Special Administrative Region of China)
    "MAC", // Macau (Special Administrative Region of China)
    "JPN", // Japan
    "MNG", // Mongolia
    "PRK", // North Korea
    "KOR", // South Korea
    "TWN", // Taiwan
  
    // South Asia
    "AFG", // Afghanistan
    "BGD", // Bangladesh
    "BTN", // Bhutan
    "IND", // India
    "IRN", // Iran
    "MDV", // Maldives
    "NPL", // Nepal
    "PAK", // Pakistan
    "LKA", // Sri Lanka
  
    // Southeast Asia
    "BRN", // Brunei
    "KHM", // Cambodia
    "IDN", // Indonesia
    "LAO", // Laos
    "MYS", // Malaysia
    "MMR", // Myanmar (Burma)
    "PHL", // Philippines
    "SGP", // Singapore
    "THA", // Thailand
    "TLS", // Timor-Leste (East Timor)
    "VNM", // Vietnam
  
    // West Asia (Middle East)
    "ARM", // Armenia
    "AZE", // Azerbaijan
    "BHR", // Bahrain
    "CYP", // Cyprus
    "GEO", // Georgia
    "IRQ", // Iraq
    "ISR", // Israel
    "JOR", // Jordan
    "KWT", // Kuwait
    "LBN", // Lebanon
    "OMN", // Oman
    "PSE", // Palestine
    "QAT", // Qatar
    "SAU", // Saudi Arabia
    "SYR", // Syria
    "TUR", // Turkey
    "ARE", // United Arab Emirates
    "YEM"  // Yemen
];
  
const EUROPE = [
    // Northern Europe
    "DNK", // Denmark
    "EST", // Estonia
    "FIN", // Finland
    "ISL", // Iceland
    "IRL", // Ireland
    "LVA", // Latvia
    "LTU", // Lithuania
    "NOR", // Norway
    "SWE", // Sweden
    "GBR", // United Kingdom
  
    // Western Europe
    "AUT", // Austria
    "BEL", // Belgium
    "FRA", // France
    "DEU", // Germany
    "LIE", // Liechtenstein
    "LUX", // Luxembourg
    "MCO", // Monaco
    "NLD", // Netherlands
    "CHE", // Switzerland
  
    // Eastern Europe
    "BLR", // Belarus
    "BGR", // Bulgaria
    "CZE", // Czech Republic
    "HUN", // Hungary
    "MDA", // Moldova
    "POL", // Poland
    "ROU", // Romania
    "RUS", // Russia
    "SVK", // Slovakia
    "UKR", // Ukraine
  
    // Southern Europe
    "ALB", // Albania
    "AND", // Andorra
    "BIH", // Bosnia and Herzegovina
    "HRV", // Croatia
    "ESP", // Spain
    "GRC", // Greece
    "ITA", // Italy
    "MKD", // North Macedonia
    "MLT", // Malta
    "MNE", // Montenegro
    "PRT", // Portugal
    "SMR", // San Marino
    "SRB", // Serbia
    "SVN", // Slovenia
    "VAT",  // Vatican City
    "XKX" // Kosovo (disputed recognition)
];

const EU27 = [
    "AUT", // Austria
    "BEL", // Belgium
    "BGR", // Bulgaria
    "HRV", // Croatia
    "CYP", // Cyprus
    "CZE", // Czech Republic
    "DNK", // Denmark
    "EST", // Estonia
    "FIN", // Finland
    "FRA", // France
    "DEU", // Germany
    "GRC", // Greece
    "HUN", // Hungary
    "IRL", // Ireland
    "ITA", // Italy
    "LVA", // Latvia
    "LTU", // Lithuania
    "LUX", // Luxembourg
    "MLT", // Malta
    "NLD", // Netherlands
    "POL", // Poland
    "PRT", // Portugal
    "ROU", // Romania
    "SVK", // Slovakia
    "SVN", // Slovenia
    "ESP", // Spain
    "SWE"  // Sweden
];

const MOST_DEVELOPED = [
    // TOP 30 in HDI 20222
    "CHE", // Switzerland
    "NOR", // Norway
    "ISL", // Iceland
    "HKG", // Hong Kong
    "DNK", // Denmark
    "SWE", // Sweden
    "IRL", // Ireland
    "DEU", // Germany
    "SGP", // Singapore
    "NLD", // Netherlands
    "AUS", // Australia
    "LIE", // Liechtenstein
    "BEL", // Belgium
    "FIN", // Finland
    "GBR", // United Kingdom
    "NZL", // New Zealand
    "ARE", // United Arab Emirates
    "CAN", // Canada
    "KOR", // South Korea
    "LUX", // Luxembourg
    "USA", // United States
    "SVN", // Slovenia
    "AUT", // Austria
    "JPN", // Japan
    "ISR", // Israel
    "MLT", // Malta
    "ESP", // Spain
    "FRA", // France
    "CYP", // Cyprus
    "ITA"  // Italy
];

const LEAST_DEVELOPED = [
    "MOZ", // Mozambique
    "SLE", // Sierra Leone
    "BFA", // Burkina Faso
    "YEM", // Yemen
    "BDI", // Burundi
    "MLI", // Mali
    "NER", // Niger
    "TCD", // Chad
    "CAF", // Central African Republic
    "SSD", // South Sudan
    "SOM", // Somalia
    "GIN", // Guinea
    "COD", // DR Congo
    "AFG", // Afghanistan
    "ETH", // Ethiopia
    "GMB", // Gambia
    "ERI", // Eritrea
    "MDG", // Madagascar
    "LBR", // Liberia
    "TGO", // Togo
    "UGA", // Uganda
    "RWA", // Rwanda
    "ZMB", // Zambia
    "BEN", // Benin
    "TJK", // Tajikistan
    "TCD", // Chad
    "NPL", // Nepal
    "HTI", // Haiti
    "PNG", // Papua New Guinea
    "DJI"  // Djibouti
];

const BRICS = ["BRA", "RUS", "IND", "CHN", "ZAF"]; // Emerging Powers

const G7 = ["CAN", "FRA", "DEU", "ITA", "JPN", "GBR", "USA"];

const G20 = [
    "ARG", "AUS", "BRA", "CAN", "CHN", "FRA", "DEU", "IND", "IDN",
    "ITA", "JPN", "MEX", "RUS", "SAU", "ZAF", "KOR", "TUR", "GBR", "USA",
    "EU-27" // EU is counted as a single member in G20
];

const OECD = [
    "AUS", "AUT", "BEL", "CAN", "CHL", "COL", "CZE", "DNK", "EST", "FIN", 
    "FRA", "DEU", "GRC", "HUN", "ISL", "IRL", "ISR", "ITA", "JPN", "KOR", 
    "LVA", "LTU", "LUX", "MEX", "NLD", "NZL", "NOR", "POL", "PRT", "SVK", 
    "SVN", "ESP", "SWE", "CHE", "TUR", "GBR", "USA"
];

const FOSSIL_EXPORTERS = [
    "SAU", "RUS", "USA", "CAN", "AUS", "IRN", "IRQ", "ARE", "NOR", "KAZ", "QAT", "KWT"
];

const SIDS = [
    "BHS", "BRB", "CUB", "DMA", "DOM", "FJI", "GRD", "HTI", "JAM", "KIR",
    "MDV", "MHL", "MUS", "NRU", "PLW", "PNG", "WSM", "STP", "SYC", "SGP",
    "SLB", "LCA", "TUV", "TON", "VUT", "VCT"
]; // 🌍 Small Island Developing States (SIDS)  

const COMMONWEALTH = [
    "AUS", "BHS", "BGD", "BRB", "BLZ", "BWA", "CMR", "CAN", "CYP", "DMA",
    "FJI", "GMB", "GHA", "GRD", "GUY", "IND", "JAM", "KEN", "KIR", "LSO",
    "MWI", "MYS", "MDV", "MLT", "MUS", "NAM", "NRU", "NZL", "NGA", "PAK",
    "PNG", "RWA", "LCA", "WSM", "SYC", "SGP", "SLB", "ZAF", "LKA", "TTO",
    "TUV", "UGA", "GBR", "TZA", "VUT", "ZMB"
];

const RENEWABLE_LEADERS = [
    "NOR", "ISL", "DNK", "SWE", "NZL", "CRI", "ESP", "FIN", "DEU", "AUT"
]; // Nations that generate the highest % of their energy from renewables.

const FOSSIL_DEPENDENT = [
    "SAU", "RUS", "USA", "CHN", "IND", "IDN", "POL", "KAZ", "IRN", "AUS"
]; // Nations with the highest % of energy from coal, oil, and gas.

const LARGEST_MILITARY = ["USA", "CHN", "IND", "RUS", "SAU", "GBR", "DEU", "JPN", "FRA", "KOR"];

const HIGHEST_GDP_PC = [
    "LUX", "SWE", "CHE", "NOR", "USA", "SGP", "ARE", "AUS", "CAN", "DNK"
];

const LOWEST_GDP_PC = [
    "BDI", "SSD", "CAF", "MOZ", "NER", "YEM", "MLI", "TCD", "COD", "AFG"
];  
  

const LARGEST_COUNTRIES = [
    "RUS", // Russia (17.1M km²)
    "CAN", // Canada (9.98M km²)
    "USA", // United States (9.83M km²)
    "CHN", // China (9.6M km²)
    "BRA", // Brazil (8.51M km²)
    "AUS", // Australia (7.68M km²)
    "IND", // India (3.29M km²)
    "ARG", // Argentina (2.78M km²)
    "KAZ", // Kazakhstan (2.72M km²)
    "DZA", // Algeria (2.38M km²)
    "COD", // Democratic Republic of the Congo (2.34M km²)
    "GRL", // Greenland (part of Denmark, 2.16M km²)
    "SAU", // Saudi Arabia (2.15M km²)
    "MEX", // Mexico (1.96M km²)
    "IDN", // Indonesia (1.91M km²)
    "SDN", // Sudan (1.88M km²)
    "LBY", // Libya (1.76M km²)
    "IRN", // Iran (1.65M km²)
    "MNG", // Mongolia (1.56M km²)
    "PER"  // Peru (1.28M km²)
];

const MOST_POPULOUS = [
    "CHN", // China (1.43B)
    "IND", // India (1.43B)
    "USA", // United States (340M)
    "IDN", // Indonesia (278M)
    "PAK", // Pakistan (240M)
    "BRA", // Brazil (216M)
    "NGA", // Nigeria (224M)
    "BGD", // Bangladesh (173M)
    "RUS", // Russia (144M)
    "MEX", // Mexico (128M)
    "ETH", // Ethiopia (127M)
    "JPN", // Japan (123M)
    "PHL", // Philippines (117M)
    "EGY", // Egypt (113M)
    "COD"  // Democratic Republic of the Congo (102M)
]; // countries over 100 Million population

const HIGHEST_CO2_EMISSIONS_PC = [
    "QAT", // Qatar
    "SGP", // Singapore
    "BRN", // Brunei
    "KWT", // Kuwait
    "ARE", // United Arab Emirates
    "SAU", // Saudi Arabia
    "OMN", // Oman
    "MNG", // Mongolia
    "BWA", // Botswana
    "BEL", // Belgium
    "MLT", // Malta
    "BHR", // Bahrain
    "PRY", // Paraguay
    "AUS", // Australia
    "FIN", // Finland
    "TTO", // Trinidad and Tobago
    "NZL", // New Zealand
    "USA", // United States
    "CAN", // Canada
    "URY", // Uruguay
    "BLZ", // Belize
    "TKM", // Turkmenistan
    "NAM", // Namibia
    "SXM", // Sint Maarten
    "LVA", // Latvia
    "CHE", // Switzerland
    "PLW", // Palau
    "NCL", // New Caledonia
    "LUX", // Luxembourg
    "IRL"  // Ireland
];

const WORLD = [
    ...SOUTH_AMERICA,
    ...NORTH_AMERICA,
    ...AFRICA,
    ...OCEANIA,
    ...ASIA,
    ...EUROPE
];


// Export common aggregate groups
export const ALL_AGGREGATES_NAMES = {
    "South America (12 countries)": "SOUTH_AMERICA",
    "North America (incl. Central A. and Caribbean)": "NORTH_AMERICA",
    "Central America": "CENTRAL_AMERICA",
    "Caribbean": "CARIBBEAN",
    "Africa": "AFRICA",
    "Oceania": "OCEANIA",
    "Asia": "ASIA",
    "Europe": "EUROPE",
    "EU27 (European Union 27 countries)": "EU27",
    "Most Developed (30 countries based on HDI)": "MOST_DEVELOPED",
    "Least Developed (30 countries based on HDI)": "LEAST_DEVELOPED",
    "Largest Countries (by area)": "LARGEST_COUNTRIES",
    "Most Populous (countries over 100 Million population)": "MOST_POPULOUS",
    "Highest CO₂ Emissions per Capita": "HIGHEST_CO2_EMISSIONS_PC",
    "BRICS (5 countries)": "BRICS",
    "G7": "G7",
    "G20": "G20",
    "OECD (37 countries)": "OECD",
    "Strongest Fossil Exporters": "FOSSIL_EXPORTERS",
    "Small Island Developing States (SIDS)": "SIDS",
    "Commonwealth": "COMMONWEALTH",
    "Renewable Energy Leaders": "RENEWABLE_LEADERS",
    "Fossil dependent countries": "FOSSIL_DEPENDENT",
    "Largest military countries": "LARGEST_MILITARY",
    "Highest GDP per Capita": "HIGHEST_GDP_PC",
    "Lowest GDP per Capita": "LOWEST_GDP_PC",
    "World": "WORLD"
};


// Export common aggregate groups
export const ALL_AGGREGATES = {
    "Welt": WORLD,
    "Europa": EUROPE,
    "Asien": ASIA,
    "Afrika": AFRICA,
    "Nord- und Zentralamerika": NORTH_AMERICA,
    "Südamerika": SOUTH_AMERICA,
    "Ozeanien": OCEANIA,
    "EU-27": EU27,
    "G20": G20,
    "G7": G7,
    "OECD (37 Länder)": OECD,
    "BRICS (5 Länder)": BRICS,
    "30 hoch entwickelte Länder (HDI)": MOST_DEVELOPED,
    "30 am wenigsten entwickelte Länder (HDI)": LEAST_DEVELOPED,
    "Größte Länder nach Fläche": LARGEST_COUNTRIES,
    "Länder über 100 Mio. Einwohner": MOST_POPULOUS,
    "Höchste CO₂-Emissionen pro Kopf": HIGHEST_CO2_EMISSIONS_PC,
    "Stärkste Fossilexporteure": FOSSIL_EXPORTERS,
    "Kleine Inselentwicklungsländer (SIDS)": SIDS,
    "Commonwealth": COMMONWEALTH,
    "Führende Länder bei erneuerbaren Energien": RENEWABLE_LEADERS,
    "Fossilabhängige Länder": FOSSIL_DEPENDENT,
    "Größte Militärländer": LARGEST_MILITARY,
    "Höchstes BIP pro Kopf": HIGHEST_GDP_PC,
    "Niedrigstes BIP pro Kopf": LOWEST_GDP_PC,
    "Zentralamerika": CENTRAL_AMERICA,
    "Karibik": CARIBBEAN,
};

// Export individual groups
export {
    SOUTH_AMERICA,
    CENTRAL_AMERICA,
    NORTH_AMERICA,
    CARIBBEAN,
    AFRICA,
    OCEANIA,
    ASIA,
    EUROPE,
    EU27,
    MOST_DEVELOPED,
    LEAST_DEVELOPED,
    LARGEST_COUNTRIES,
    MOST_POPULOUS,
    HIGHEST_CO2_EMISSIONS_PC,
    BRICS,
    G7,
    G20,
    OECD,
    FOSSIL_EXPORTERS,
    SIDS,
    COMMONWEALTH,
    RENEWABLE_LEADERS,
    WORLD
};

/**
 * Get a country group by name.
 * @param {string} groupName - Name of the country group.
 * @returns {Array<string>|null} - List of ISO country codes, or null if not found.
 */
export function getCountryGroup(groupName) {
    // console.log(`getCountryGroup triggered with groupName: ${groupName}`);
    return ALL_AGGREGATES[groupName] || null;
}

/**
 * Check if a given name is an aggregate group name.
 * @param {string} name - The name to check.
 * @returns {boolean} - True if the name is an aggregate group name, false otherwise.
 */
export function isAggregateGroupNameByName(name) {
    // console.log(`isAggregateGroupNameByName triggered with name: ${name}`);
    const result = Object.values(ALL_AGGREGATES_NAMES).some(group => group.includes(name));
    // console.log(`isAggregateGroupNameByName result: ${result}`);
    return result;
}

/**
 * Check if a given key is an aggregate group key.
 * @param {string} key - The key to check.
 * @returns {boolean} - True if the key is an aggregate group key, false otherwise.
 */
export function isAggregateGroupNameByKey(key) {
    // console.log(`isAggregateGroupNameByKey triggered with key: ${key}`);
    const result = Object.keys(ALL_AGGREGATES_NAMES).includes(key);
    // console.log(`isAggregateGroupNameByKey result: ${result}`);
    return result;
}
