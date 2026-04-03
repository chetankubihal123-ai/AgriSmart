export interface LocationData {
    [district: string]: {
        [taluk: string]: {
            [hobli: string]: string[];
        };
    };
}

export const karnatakaLocations: LocationData = {
    "Bagalkot": {
        "Bagalkot": { "Kasaba": ["Bagalkot Town", "Benakatti", "Kadampur", "Simikeri"], "Kaladgi": ["Kaladgi", "Sokkane", "Khyad", "Anagawadi"] },
        "Badami": { "Kasaba": ["Badami Town", "Cholachagudda", "Ananthapur"], "Kulgeri": ["Kulgeri", "Anawal", "Hosur"] },
        "Hungund": { "Kasaba": ["Hungund Town", "Amingad", "Ganjihal"], "Ilkal": ["Ilkal Town", "Dhammanur"] },
        "Jamkhandi": { "Kasaba": ["Jamkhandi Town", "Savalagi", "Chikkalaki"], "Terdal": ["Terdal", "Rabakavi", "Banahatti"] },
        "Bilagi": { "Kasaba": ["Bilagi Town", "Anagawadi", "Honnihal"] },
        "Mudhol": { "Kasaba": ["Mudhol Town", "Lokapur", "Petlur"], "Mahalingpur": ["Mahalingpur Town", "Uttur"] }
    },
    "Ballari": {
        "Ballari": { "Kasaba": ["Ballari City", "Siddiginamola", "Halkundi"], "Moka": ["Moka", "Belagal", "Kolur"] },
        "Sandur": { "Kasaba": ["Sandur Town", "Yeshwanthanagar", "Donimalai"], "Choranur": ["Choranur", "Toranagallu", "Bannigola"] },
        "Siruguppa": { "Kasaba": ["Siruguppa Town", "Tekkalakote", "Desanuru"] },
        "Kurugodu": { "Kasaba": ["Kurugodu Town", "Emmiganur", "Kudatini"] },
        "Kampli": { "Kasaba": ["Kampli Town", "Emmiganur", "Belgodu"] }
    },
    "Belagavi": {
        "Belagavi": {
            "Kasaba": ["Belagavi City", "Hindalga", "Angol", "Tilakwadi", "Majgaon", "Shahapur", "Vadgaon", "Khasbag", "Anagol"],
            "Uchgaon": ["Uchgaon", "Bache", "Turmuri", "Yellur", "Sulga", "Vantamuri", "Belagundi", "Bambaraga", "Kusamalli"],
            "Hirebagewadi": ["Hirebagewadi", "MK Hubli", "Bailur", "Bastawad", "Bhendigeri", "Chandagudi", "Desnur", "Itagi", "Kittur"],
            "Kakati": ["Kakati", "Honaga", "Kangrali BK", "Kangrali KH", "Vantamuri", "Yamanapur", "Goundawad", "Muchandi", "Sutagatti"]
        },
        "Athani": {
            "Kasaba": ["Athani Town", "Aigali", "Darur", "Kokatnur", "Kohalli", "Masarguppi", "Nandgaon", "Shedbal", "Telsang", "Zunjarwad"],
            "Telsang": ["Telsang", "Kempwad", "Aratagal", "Hulagabali", "Kanamadi", "Kavatagi"],
            "Anatapur": ["Anatapur", "Chamakeri", "Hulagbali", "Kempwad", "Shedbal"]
        },
        "Gokak": { "Kasaba": ["Gokak Town", "Upparatti", "Dhupadal"], "Koujala": ["Koujala", "Ankalagi", "Nidagundi"] },
        "Chikkodi": { "Kasaba": ["Chikkodi Town", "Kabbur", "Ankali"], "Sadalaga": ["Sadalaga", "Bedkihal", "Galatga", "Bhoj"] },
        "Bailhongal": { "Kasaba": ["Bailhongal Town", "Sampgaon", "Neginal"], "Nesargi": ["Nesargi", "Deshnur", "Madanabhavi"] },
        "Khanapur": { "Kasaba": ["Khanapur Town", "Beedi", "Gunji", "Jamboti", "Londa", "Nandgad"] },
        "Ramdurga": { "Kasaba": ["Ramdurga Town", "Salapur", "Hulagabali"] },
        "Saundatti": { "Kasaba": ["Saundatti Town", "Munavalli", "Huli", "Yellama-Gudda"] },
        "Mudalagi": { "Kasaba": ["Mudalagi Town", "Arabhavi", "Sunadholi"] },
        "Nippani": { "Kasaba": ["Nippani Town", "Yarnal", "Benadi"] },
        "Kagwad": { "Kasaba": ["Kagwad Town", "Mole", "Ainapur"] },
        "Kittur": { "Kasaba": ["Kittur Town", "Devarahubli", "Kulavalli"] }
    },
    "Bengaluru Urban": {
        "Bengaluru North": {
            "Kasaba": ["Hebbal", "Malleshwaram", "Yeshwanthpur", "Sadashivanagar", "Sanjaynagar"],
            "Yelahanka": ["Yelahanka Town", "Jakkur", "Sahakar Nagar", "Kodigehalli", "Byatarayanapura", "Kogilu"],
            "Dasanapura": ["Dasanapura", "Hesaraghatta", "Madavara", "Adakamaranahalli", "Aluru", "Bettanagere", "Thammenahalli"]
        },
        "Bengaluru South": {
            "Kasaba": ["Basavanagudi", "Jayanagar", "JP Nagar", "Padmanabhanagar", "Banashankari"],
            "Uttarahalli": ["Uttarahalli", "Kengeri", "Kumbalgodu", "Subramanyapura", "Gubbalala"],
            "Begur": ["Begur", "Hulimavu", "Bommanahalli", "Elekonahalli", "Koppa"]
        },
        "Anekal": { "Kasaba": ["Anekal Town", "Jigani Town", "Bannerghatta"], "Attibele": ["Attibele", "Chandapura", "Sarjapura"] },
        "Yelahanka": { "Kasaba": ["Byatarayanapura", "Kodigehalli"], "Jala": ["Jala Hobli", "Sadahalli", "Budigere"] },
        "Bengaluru East": { "Kasaba": ["KR Puram", "Mahadevapura", "Marathahalli"], "Varthur": ["Varthur Town", "Whitefield", "Gunjur"] }
    },
    "Dharwad": {
        "Dharwad": {
            "Kasaba": ["Dharwad City", "Kelageri", "Mummigatti", "Nuggekeri", "Agasanahalli", "Belur", "Yettinaguda", "Sattur", "Rayapur", "Lakamanahalli", "Somapur", "Hosayallapur"],
            "Amminabhavi": ["Amminabhavi", "Marewad", "Heballi", "Uppinbetageri", "Harobelavadi", "Hanamanakoppa", "Pudakalakatti", "Karadigudda", "Thimmapura", "Kavalgeri", "Chandanmatti", "Kanakur"],
            "Narendra": ["Narendra", "Mugad", "Garag", "Mummigatti", "Malligwad", "Chikka Malligwad", "Mukambika Nagar", "Yettinaguda", "Govanakoppa", "Khanapur", "Kumbapur"]
        },
        "Hubballi": {
            "Kasaba": ["Hubballi City", "Keshwapur", "Mantur", "Bengeri", "Kallur", "Sulla", "Byahatti", "Hebballi", "Nagalapur", "Palej"],
            "Gokul": ["Gokul", "Amargol", "Tarihal", "Gabbur", "Unkal", "Sattur", "Hosur", "Bhairidevarakoppa", "Rayanal"]
        },
        "Kundgol": {
            "Kasaba": ["Kundgol Town", "Hirenarti", "Kubihal", "Ingalagi", "Benakanahalli", "Baradwad", "Bettadur", "Bilebal", "Budihal"],
            "Gudageri": ["Gudageri", "Yeraguppi", "Hirenarti", "Hiregunjal", "Hirewaddatti", "Kandikuppa", "Kalas", "Mattigatti", "Mullur"],
            "Saunshi": ["Saunshi", "Kamadolli", "Rottigwad", "Pashupatihala", "Ramanakoppa", "Sherewad", "Sompur", "Sultanpur", "Yarabal"]
        },
        "Navalgund": { "Kasaba": ["Navalgund Town", "Hebsur", "Shalavadi", "Tirlapur", "Ballur"] },
        "Kalghatgi": { "Kasaba": ["Kalghatgi Town", "Mishrikoti", "Dugalapur", "Ganjigatti"] },
        "Alnavara": { "Kasaba": ["Alnavara Town", "Benachi"] },
        "Annigeri": { "Kasaba": ["Annigeri Town", "Abbigeri"] }
    },
    "Mysuru": {
        "Mysuru": {
            "Kasaba": ["Mysuru City", "Siddalingapura", "Hinkal", "Kurubarahalli", "Mandakalli", "Alanahalli", "Chamundi Hill"],
            "Varuna": ["Varuna", "Kadakola", "Varakodu", "Hosakotal", "Suttur Mutt", "Dandikere", "Chikkahalli", "Keelanpura"],
            "Jayapura": ["Jayapura", "Marballi", "Dhanagalli", "Beerihundi", "Doranahalli", "Daripura", "Harohalli", "Gopalapura"],
            "Elivala": ["Elivala", "Belavadi", "Yelwala", "Gungral Chathra", "Hootagalli", "Amulya Nagar", "Hebbal"]
        },
        "Nanjangud": { "Kasaba": ["Nanjangud Town", "Sujathapura"], "Hullahalli": ["Hullahalli", "Kattavadipura"] },
        "Hunsur": { "Kasaba": ["Hunsur Town", "Hanagodu"], "Bilikere": ["Bilikere", "Dharmapura"] },
        "T.Narsipur": { "Kasaba": ["T.Narsipur Town", "Bannur Town"], "Mugur": ["Mugur", "Sosale", "Talakadu"] }
    },
    "Vijayapura": {
        "Vijayapura": { "Kasaba": ["Vijayapura City", "Tikota", "Mamadhapur"], "Babaleshwar": ["Babaleshwar", "Bhurat", "Sarwad"] },
        "Indi": { "Kasaba": ["Indi Town", "Loni", "Horti", "Zalki"] },
        "Sindhagi": { "Kasaba": ["Sindhagi Town", "Almel Town", "Devarahipparagi"] }
    },
    "Shivamogga": {
        "Shivamogga": { "Kasaba": ["Shivamogga City", "Holenahalli"], "Kumsi": ["Kumsi", "Ayanur"] },
        "Sagara": { "Kasaba": ["Sagara Town", "Anandapura"], "Anandapura": ["Anandapura", "Iduvani"] }
    },
    "Tumakuru": { "Tumakuru": { "Kasaba": ["Tumakuru City", "Hirehalli"], "Bellavi": ["Bellavi", "Mallasandra"] }, "Tiptur": { "Kasaba": ["Tiptur Town", "Honavalli"] } },
    "Raichur": { "Raichur": { "Kasaba": ["Raichur City", "Yeragera"], "Yeragera": ["Yeragera", "Deosugur"] }, "Manvi": { "Kasaba": ["Manvi Town", "Sirwar"] } },
    "Gadag": { "Gadag": { "Kasaba": ["Gadag-Betageri", "Mulgund"], "Mulgund": ["Mulgund", "Kurtakoti"] }, "Ron": { "Kasaba": ["Ron Town", "Naregal"] } },
    "Haveri": { "Haveri": { "Kasaba": ["Haveri City", "Guttal"], "Guttal": ["Guttal", "Negalur"] }, "Ranebennur": { "Kasaba": ["Ranebennur City", "Halageri"] } },
    "Kalaburagi": { "Kalaburagi": { "Kasaba": ["Kalaburagi City", "Kamalapura"], "Kamalapura": ["Kamalapura", "Mahagaon"] }, "Sedam": { "Kasaba": ["Sedam Town", "Kurkunta"] } },
    "Koppal": { "Koppal": { "Kasaba": ["Koppal Town", "Irkalgada"], "Alwandi": ["Alwandi", "Munnirabad"] }, "Gangavathi": { "Kasaba": ["Gangavathi City", "Karatagi"] } },
    "Yadgir": { "Yadgir": { "Kasaba": ["Yadgir City", "Gurmitkal"], "Gurmitkal": ["Gurmitkal", "Saidapur"] }, "Shahapur": { "Kasaba": ["Shahapur", "Sagar"] } },
    "Kolar": { "Kolar": { "Kasaba": ["Kolar City", "Vemagal"], "Vemagal": ["Vemagal", "Narasapura"] }, "Malur": { "Kasaba": ["Malur Town", "Masti"] } },
    "Chikkaballapur": { "Chikkaballapur": { "Kasaba": ["Chikkaballapur Town", "Nandi"], "Nandi": ["Nandi", "Sultanpet"] }, "Chintamani": { "Kasaba": ["Chintamani Town", "Kaiwara"] } },
    "Ramanagara": { "Ramanagara": { "Kasaba": ["Ramanagara Town", "Bidadi"], "Bidadi": ["Bidadi", "Harohalli"] }, "Kanakapura": { "Kasaba": ["Kanakapura", "Sathnur"] } },
    "Mandya": { "Mandya": { "Kasaba": ["Mandya City", "Keragodu"], "Keragodu": ["Keragodu", "Holalu"] }, "Maddur": { "Kasaba": ["Maddur Town", "Koppa"] } },
    "Hassan": { "Hassan": { "Kasaba": ["Hassan City", "Shantigrama"], "Shantigrama": ["Shantigrama", "Gorur"] }, "Arsikere": { "Kasaba": ["Arsikere Town", "Banavara"] } },
    "Chitradurga": { "Chitradurga": { "Kasaba": ["Chitradurga City", "Bharamasagara"], "Bharamasagara": ["Bharamasagara", "Sirigere"] }, "Hiriyur": { "Kasaba": ["Hiriyur Town", "Dharmapura"] } },
    "Davanagere": { "Davanagere": { "Kasaba": ["Davanagere City", "Mayakonda"], "Mayakonda": ["Mayakonda", "Anagodu"] }, "Harihar": { "Kasaba": ["Harihar Town", "Malebennur"] } },
    "Vijayanagara": { "Hosapete": { "Kasaba": ["Hosapete City", "Kamalapura"], "Kamalapura": ["Kamalapura", "Hampi"] }, "Harapanahalli": { "Kasaba": ["Harapanahalli Town", "Arasikere"] } },
    "Uttara Kannada": { "Karwar": { "Kasaba": ["Karwar City", "Mallapur"], "Mallapur": ["Mallapur", "Kodasalli"] }, "Kumta": { "Kasaba": ["Kumta Town", "Gokarna"] } },
    "Kodagu": { "Madikeri": { "Kasaba": ["Madikeri Town", "Napoklu"], "Napoklu": ["Napoklu", "Balamuri"] }, "Virajpet": { "Kasaba": ["Virajpet Town", "Ponnampet"] } }
};
