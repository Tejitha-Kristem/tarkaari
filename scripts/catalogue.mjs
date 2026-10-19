// Single source of truth for the starter catalogue.
// Run `npm run catalogue` to regenerate supabase/seed.sql and the placeholder
// pictures in public/veg/. Add real photos with `npm run photo -- <slug> <file>`.
//
// [slug, English, Kannada, default unit, category, other names]
// "Other names" are what people type or say in lists: spelling variants,
// Kannada words in English letters, Hindi names. They power list-to-cart.
export const catalogue = [
  // Daily needs
  ["onion", "Onion", "ಈರುಳ್ಳಿ", "kg", "daily", ["onions", "eerulli", "irulli", "erulli", "pyaz", "pyaaz", "kanda"]],
  ["small-onion", "Small onion", "ಸಣ್ಣ ಈರುಳ್ಳಿ", "kg", "daily", ["shallot", "shallots", "sambar onion", "sambar eerulli", "sanna eerulli", "ಸಾಂಬಾರ್ ಈರುಳ್ಳಿ"]],
  ["tomato", "Tomato", "ಟೊಮೇಟೊ", "kg", "daily", ["tomatoes", "tamatar", "tomoto", "tometo", "ಟೊಮ್ಯಾಟೊ", "ಟೊಮೆಟೊ", "ಟಮೋಟ"]],
  ["potato", "Potato", "ಆಲೂಗಡ್ಡೆ", "kg", "daily", ["potatoes", "aloo", "alu", "alugadde", "aalugadde", "batate", "ಬಟಾಟೆ"]],
  ["green-chilli", "Green chilli", "ಹಸಿಮೆಣಸಿನಕಾಯಿ", "g", "daily", ["chilli", "chillies", "chili", "green chili", "mirchi", "hari mirch", "menasinakai", "hasi menasinakai", "ಮೆಣಸಿನಕಾಯಿ"]],
  ["ginger", "Ginger", "ಶುಂಠಿ", "g", "daily", ["adrak", "shunti", "shunthi"]],
  ["garlic", "Garlic", "ಬೆಳ್ಳುಳ್ಳಿ", "g", "daily", ["lahsun", "lehsun", "bellulli"]],
  ["lemon", "Lemon", "ನಿಂಬೆಹಣ್ಣು", "piece", "daily", ["lemons", "nimbu", "limbu", "nimbe", "nimbehannu", "ನಿಂಬೆ"]],
  ["coriander", "Coriander leaves", "ಕೊತ್ತಂಬರಿ ಸೊಪ್ಪು", "bunch", "daily", ["kothambari", "kottambari", "kothambari soppu", "kothmir", "dhaniya", "dhania", "cilantro", "ಕೊತ್ತಂಬರಿ"]],
  ["curry-leaves", "Curry leaves", "ಕರಿಬೇವು", "bunch", "daily", ["curry leaf", "karibevu", "kari bevu", "kadi patta", "curry patta", "ಕರಿಬೇವಿನ ಸೊಪ್ಪು"]],
  ["coconut", "Coconut", "ತೆಂಗಿನಕಾಯಿ", "piece", "daily", ["coconuts", "nariyal", "thengina kai", "tenginakayi", "kayi", "ಕಾಯಿ"]],

  // Vegetables
  ["carrot", "Carrot", "ಕ್ಯಾರೆಟ್", "kg", "vegetables", ["carrots", "gajar", "gajjari", "ಗಜ್ಜರಿ"]],
  ["beans", "Beans", "ಹುರುಳಿಕಾಯಿ", "kg", "vegetables", ["french beans", "huralikai", "huralikayi", "hurali kayi", "ಬೀನ್ಸ್"]],
  ["cabbage", "Cabbage", "ಎಲೆಕೋಸು", "kg", "vegetables", ["patta gobi", "kosu", "ele kosu", "elekosu"]],
  ["cauliflower", "Cauliflower", "ಹೂಕೋಸು", "piece", "vegetables", ["gobi", "phool gobi", "hookosu", "hoo kosu"]],
  ["brinjal", "Brinjal", "ಬದನೆಕಾಯಿ", "kg", "vegetables", ["eggplant", "aubergine", "baingan", "badanekai", "badanekayi", "ಬದನೆ"]],
  ["ladies-finger", "Lady's finger", "ಬೆಂಡೆಕಾಯಿ", "kg", "vegetables", ["ladies finger", "lady finger", "okra", "bhindi", "bendekai", "bendekayi", "ಬೆಂಡೆ"]],
  ["capsicum", "Capsicum", "ದಪ್ಪ ಮೆಣಸಿನಕಾಯಿ", "kg", "vegetables", ["bell pepper", "shimla mirch", "dappa menasinakai", "ಕ್ಯಾಪ್ಸಿಕಂ"]],
  ["cucumber", "Cucumber", "ಸೌತೆಕಾಯಿ", "kg", "vegetables", ["kheera", "khira", "southekai", "sautekayi", "ಸೌತೆ"]],
  ["bottle-gourd", "Bottle gourd", "ಸೋರೆಕಾಯಿ", "piece", "vegetables", ["lauki", "ghiya", "doodhi", "sorekai", "sorekayi"]],
  ["ridge-gourd", "Ridge gourd", "ಹೀರೆಕಾಯಿ", "kg", "vegetables", ["turai", "tori", "heerekai", "heerekayi"]],
  ["bitter-gourd", "Bitter gourd", "ಹಾಗಲಕಾಯಿ", "kg", "vegetables", ["karela", "hagalakai", "hagalakayi"]],
  ["snake-gourd", "Snake gourd", "ಪಡವಲಕಾಯಿ", "kg", "vegetables", ["padavalakai", "padavalakayi", "chichinda"]],
  ["ivy-gourd", "Ivy gourd", "ತೊಂಡೆಕಾಯಿ", "kg", "vegetables", ["tondekai", "tondekayi", "tindora", "tendli", "kundru"]],
  ["ash-gourd", "Ash gourd", "ಬೂದುಕುಂಬಳಕಾಯಿ", "kg", "vegetables", ["petha", "white pumpkin", "boodu kumbalakai", "budukumbalakayi"]],
  ["pumpkin", "Pumpkin", "ಸಿಹಿಕುಂಬಳಕಾಯಿ", "kg", "vegetables", ["kaddu", "red pumpkin", "sihi kumbalakai", "kumbalakayi"]],
  ["drumstick", "Drumstick", "ನುಗ್ಗೆಕಾಯಿ", "piece", "vegetables", ["drumsticks", "moringa", "nuggekai", "nuggekayi", "sahjan"]],
  ["raw-banana", "Raw banana", "ಬಾಳೆಕಾಯಿ", "piece", "vegetables", ["plantain", "kacha kela", "balekai", "baalekayi"]],
  ["chow-chow", "Chow chow", "ಸೀಮೆ ಬದನೆಕಾಯಿ", "kg", "vegetables", ["chayote", "seeme badanekai", "seemebadanekayi"]],
  ["cluster-beans", "Cluster beans", "ಗೋರಿಕಾಯಿ", "kg", "vegetables", ["guar", "gawar", "gorikai", "gorikayi"]],
  ["avarekai", "Field beans (Avarekai)", "ಅವರೆಕಾಯಿ", "kg", "vegetables", ["avare", "avarekalu", "field beans", "hyacinth beans", "papdi", "ಅವರೆ"]],
  ["green-peas", "Green peas", "ಹಸಿ ಬಟಾಣಿ", "kg", "vegetables", ["peas", "matar", "batani", "hasi batani", "ಬಟಾಣಿ"]],
  ["knol-khol", "Knol-khol", "ನವಿಲುಕೋಸು", "kg", "vegetables", ["kohlrabi", "navilkosu", "navilu kosu", "ganth gobi"]],
  ["raw-mango", "Raw mango", "ಮಾವಿನಕಾಯಿ", "piece", "vegetables", ["mango", "kairi", "mavinakai", "maavinakayi", "kacha aam"]],

  // Roots & tubers
  ["beetroot", "Beetroot", "ಬೀಟ್‌ರೂಟ್", "kg", "roots", ["beet", "chukandar", "ಬೀಟ್ರೂಟ್"]],
  ["radish", "Radish", "ಮೂಲಂಗಿ", "kg", "roots", ["mooli", "mullangi", "moolangi", "mulangi"]],
  ["sweet-potato", "Sweet potato", "ಗೆಣಸು", "kg", "roots", ["shakarkandi", "genasu", "genesu"]],
  ["yam", "Elephant foot yam", "ಸುವರ್ಣಗಡ್ಡೆ", "kg", "roots", ["suran", "elephant yam", "suvarna gadde"]],

  // Leafy greens & herbs
  ["spinach", "Spinach (Palak)", "ಪಾಲಕ್ ಸೊಪ್ಪು", "bunch", "leafy", ["palak", "palak soppu", "ಪಾಲಕ್"]],
  ["amaranth", "Amaranth (Dantu)", "ದಂಟಿನ ಸೊಪ್ಪು", "bunch", "leafy", ["dantu", "dantu soppu", "dantina soppu", "chaulai", "harive"]],
  ["methi", "Fenugreek (Methi)", "ಮೆಂತ್ಯ ಸೊಪ್ಪು", "bunch", "leafy", ["fenugreek", "menthya", "menthya soppu", "menthe soppu", "ಮೆಂತೆ ಸೊಪ್ಪು"]],
  ["dill", "Dill (Sabsige)", "ಸಬ್ಬಸಿಗೆ ಸೊಪ್ಪು", "bunch", "leafy", ["sabsige", "sabbasige", "sabsige soppu", "shepu", "suva"]],
  ["mint", "Mint", "ಪುದೀನ", "bunch", "leafy", ["pudina", "pudhina", "ಪುದಿನ"]],
  ["spring-onion", "Spring onion", "ಈರುಳ್ಳಿ ಸೊಪ್ಪು", "bunch", "leafy", ["spring onions", "green onion", "scallion", "hara pyaz", "eerulli soppu"]],

  // Others
  ["mushroom", "Mushroom", "ಅಣಬೆ", "packet", "other", ["mushrooms", "anabe", "khumb"]],
  ["baby-corn", "Baby corn", "ಬೇಬಿ ಕಾರ್ನ್", "packet", "other", ["babycorn"]],
  ["sweet-corn", "Sweet corn", "ಸಿಹಿ ಮೆಕ್ಕೆಜೋಳ", "piece", "other", ["corn", "bhutta", "makkejola", "jola"]],
];
