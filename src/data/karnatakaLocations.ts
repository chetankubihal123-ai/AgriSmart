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
        "Mudhol": { "Kasaba": ["Mudhol Town", "Lokapur", "Petlur"], "Mahalingpur": ["Mahalingpur Town", "Uttur"] },
        "Guledgudda": { "Kasaba": ["Guledgudda Town", "Asangi", "Kotikal"] },
        "Ilkal": { "Kasaba": ["Ilkal Town", "Gora", "Hire-Singanagutti"] },
        "Rabkavi Banhatti": { "Kasaba": ["Rabkavi Town", "Banhatti Town", "Rampur"] }
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
        "Kittur": { "Kasaba": ["Kittur Town", "Devarahubli", "Kulavalli"] },
        "Hukkeri": { "Kasaba": ["Hukkeri Town", "Sankeshwar Town", "Yamakanamaradi"] },
        "Rayabag": { "Kasaba": ["Rayabag Town", "Kudachi Town", "Harugeri"] }
    },
    "Bengaluru Rural": {
        "Devanahalli": { "Kasaba": ["Devanahalli Town", "Vijayapura Town", "Channasandra", "Avathi"], "Kundana": ["Kundana", "Jalige", "Koira"] },
        "Doddaballapura": { "Kasaba": ["Doddaballapura Town", "Sasalu", "Tubagere"], "Madhure": ["Madhure", "Doddabelavangala"] },
        "Hoskote": { "Kasaba": ["Hoskote Town", "Sulibele", "Jadigenahalli", "Anugondanahalli"] },
        "Nelamangala": { "Kasaba": ["Nelamangala Town", "Tyamagondlu", "Somapura", "Gollahalli"] }
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
    "Bidar": {
        "Bidar": { "Kasaba": ["Bidar City", "Bagdal", "Kamthana"], "Mannaekhelli": ["Mannaekhelli", "Chidri"] },
        "Bhalki": { "Kasaba": ["Bhalki Town", "Halbarga", "Dhupatmahagaon"] },
        "Aurad": { "Kasaba": ["Aurad Town", "Kamalnagar", "Santpur"] },
        "Basavakalyan": { "Kasaba": ["Basavakalyan Town", "Mudbi", "Morkhandi"] },
        "Humnabad": { "Kasaba": ["Humnabad Town", "Dubalgundi", "Chitguppa"] }
    },
    "Chamarajanagara": {
        "Chamarajanagara": { "Kasaba": ["Chamarajanagara Town", "Harave", "Chandakavadi"], "Santhemarahalli": ["Santhemarahalli", "Kuderu"] },
        "Gundlupet": { "Kasaba": ["Gundlupet Town", "Begur", "Hangala"] },
        "Kollegala": { "Kasaba": ["Kollegala Town", "Mudigunda", "Kamageri"] },
        "Yelandur": { "Kasaba": ["Yelandur Town", "Mellahalli", "Agara"] },
        "Hanur": { "Kasaba": ["Hanur Town", "Ramapura", "Lakkur"] }
    },
    "Chikkaballapur": {
        "Chikkaballapur": { "Kasaba": ["Chikkaballapur Town", "Nandi"], "Nandi": ["Nandi", "Sultanpet"] },
        "Bagepalli": { "Kasaba": ["Bagepalli Town", "Pathapalya", "Chelur"] },
        "Chintamani": { "Kasaba": ["Chintamani Town", "Kaiwara", "Mylanahalli"] },
        "Gauribidanur": { "Kasaba": ["Gauribidanur Town", "Manchenahalli", "D.Palya"] },
        "Gudibanda": { "Kasaba": ["Gudibanda Town", "Somenahalli"] },
        "Sidlaghatta": { "Kasaba": ["Sidlaghatta Town", "Sadali", "Jangamakote"] }
    },
    "Chikkamagaluru": {
        "Chikkamagaluru": { "Kasaba": ["Chikkamagaluru Town", "Aldur", "Amble"], "Vastare": ["Vastare", "Khandya"] },
        "Kadur": { "Kasaba": ["Kadur Town", "Birur Town", "Singatagere"] },
        "Koppa": { "Kasaba": ["Koppa Town", "Hariharapura", "Lakkavalli"] },
        "Mudigere": { "Kasaba": ["Mudigere Town", "Gonibeedu", "Kalasa"] },
        "Narasimharajapura": { "Kasaba": ["NR Pura Town", "Balehonnur"] },
        "Sringeri": { "Kasaba": ["Sringeri Town", "Kigga", "Addagadde"] },
        "Tarikere": { "Kasaba": ["Tarikere Town", "Lakkavalli", "Ajjampura"] },
        "Ajjampura": { "Kasaba": ["Ajjampura Town", "Shivani"] },
        "Kalasa": { "Kasaba": ["Kalasa Town", "Hirebyle"] }
    },
    "Chitradurga": {
        "Chitradurga": { "Kasaba": ["Chitradurga City", "Bharamasagara"], "Bharamasagara": ["Bharamasagara", "Sirigere"] },
        "Challakere": { "Kasaba": ["Challakere Town", "Parasurampura", "Nayakanahatti"] },
        "Hiriyur": { "Kasaba": ["Hiriyur Town", "Dharmapura", "Aimangala"] },
        "Holalkere": { "Kasaba": ["Holalkere Town", "Ramagiri", "B Durga"] },
        "Hosadurga": { "Kasaba": ["Hosadurga Town", "Srirampur", "Madadakere"] },
        "Molakalmuru": { "Kasaba": ["Molakalmuru Town", "Rampura", "Devarahatta"] }
    },
    "Dakshina Kannada": {
        "Mangaluru": { "Kasaba": ["Mangaluru City", "Ullal Town", "Bajpe", "Surathkal"], "Gurupura": ["Gurupura", "Mulki Town", "Kinnigoli"] },
        "Bantwal": { "Kasaba": ["Bantwal Town", "Panemangalore", "Vittal Town"] },
        "Belthangady": { "Kasaba": ["Belthangady Town", "Kokkada", "Venur"] },
        "Moodabidri": { "Kasaba": ["Moodabidri Town", "Alangar", "Shirthady"] },
        "Kadaba": { "Kasaba": ["Kadaba Town", "Nelyadi", "Mardhala"] },
        "Puttur": { "Kasaba": ["Puttur Town", "Uppinangady", "Nidle"] },
        "Sullia": { "Kasaba": ["Sullia Town", "Jalsoor", "Subrahmanya"] }
    },
    "Davanagere": {
        "Davanagere": { "Kasaba": ["Davanagere City", "Mayakonda"], "Mayakonda": ["Mayakonda", "Anagodu"] },
        "Channagiri": { "Kasaba": ["Channagiri Town", "Hodigere", "Pandomatti"] },
        "Harihara": { "Kasaba": ["Harihar Town", "Malebennur", "Bhanuvalli"] },
        "Honnali": { "Kasaba": ["Honnali Town", "Nyamathi Town", "Kundur"] },
        "Jagalur": { "Kasaba": ["Jagalur Town", "Bilichodu", "Sokke"] },
        "Nyamathi": { "Kasaba": ["Nyamathi Town", "Belagutti"] }
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
    "Gadag": {
        "GADAG": {
            "BETAGERI": ["Betageri Town", "Hatalgeri", "Kanaginahal", "Sambhad", "Hartla", "Yelishirur"],
            "GADAGA": ["Gadag Town", "Mulgund", "Kurtakoti", "Lakkundi", "Asundi", "Balaganur", "Chikhandigol"]
        },
        "GAJENDRAGAD": {
            "GAJENDRAGADA": ["Gajendragad Town", "Unachagi", "Rajur", "Kalakaleshwar", "Musigeri", "Rampura"]
        },
        "LAXMESHWAR": {
            "LAXMESHWARA": ["Laxmeshwar Town", "Adarakatti", "Bastarawada", "Hullur", "Muttur", "Shiggaon"]
        },
        "MUNDARGI": {
            "MUNDARAGI": ["Mundargi Town", "Dambal", "Kalkeri", "Doni", "Hallikeri", "Singatalur"]
        },
        "NARAGUND": {
            "NARAGUNDA": ["Nargund Town", "Konnur", "Vasana", "Shirol", "Banahatti", "Hadli"]
        },
        "RON": {
            "HOLEALURA": ["Holealur", "Amaragol", "Balaganur", "Belavanaki", "Hulikeri", "Menasagi", "Sudi"],
            "NAREGALLA": ["ABBIGERI", "DA SA HADAGA", "GUJAMAGADI", "JAKKALI", "KURADAGI", "NAGARALA", "YAREBELERA"],
            "RONA": ["Ron Town", "Naregal", "Mallapur", "Mugali", "Abbigeri", "Jakkali"]
        },
        "SHIRAHATTI": {
            "SHIRAHATTI": ["Shirhatti Town", "Hebbal", "Machanahalli", "Laxmapur", "Kundur", "Yellapur"]
        }
    },
    "Hassan": {
        "Hassan": { "Kasaba": ["Hassan City", "Shantigrama"], "Shantigrama": ["Shantigrama", "Gorur"] },
        "Alur": { "Kasaba": ["Alur Town", "Palya", "Kenchammana Hosakote"] },
        "Arakalgud": { "Kasaba": ["Arakalgud Town", "Konanur", "Mallipatna"] },
        "Arsikere": { "Kasaba": ["Arsikere Town", "Banavara", "Ganduasi"] },
        "Belur": { "Kasaba": ["Belur Town", "Halebeedu", "Bikkodu"] },
        "Channarayapatna": { "Kasaba": ["Channarayapatna Town", "Shravanabelagola", "Nuggehalli"] },
        "Holenarasipura": { "Kasaba": ["Holenarasipura Town", "Halekote", "Dandinashivara"] },
        "Sakleshpur": { "Kasaba": ["Sakleshpur Town", "Yesalur", "Hettur"] }
    },
    "Haveri": {
        "Haveri": { "Kasaba": ["Haveri City", "Guttal"], "Guttal": ["Guttal", "Negalur"] },
        "Byadgi": { "Kasaba": ["Byadgi Town", "Kaginele", "Motebennur"] },
        "Hangal": { "Kasaba": ["Hangal Town", "Adur", "Akkialur"] },
        "Hirekerur": { "Kasaba": ["Hirekerur Town", "Rattihalli Town"] },
        "Ranebennur": { "Kasaba": ["Ranebennur City", "Halageri", "Medleri"] },
        "Savanur": { "Kasaba": ["Savanur Town", "Hattimattur"] },
        "Shiggaon": { "Kasaba": ["Shiggaon Town", "Bankapur Town"] },
        "Rattihalli": { "Kasaba": ["Rattihalli Town", "Masur"] }
    },
    "Kalaburagi": {
        "Kalaburagi": { "Kasaba": ["Kalaburagi City", "Kamalapura"], "Kamalapura": ["Kamalapura", "Mahagaon"] },
        "Sedam": { "Kasaba": ["Sedam Town", "Kurkunta", "Mudhola"] },
        "Afzalpur": { "Kasaba": ["Afzalpur Town", "Reur", "Ganajakhed"] },
        "Aland": { "Kasaba": ["Aland Town", "Narona", "Khajuri"] },
        "Chincholi": { "Kasaba": ["Chincholi Town", "Sulepeth", "Kunchavaram"] },
        "Chittapur": { "Kasaba": ["Chittapur Town", "Shahabad Town", "Kalgi"] },
        "Jewargi": { "Kasaba": ["Jewargi Town", "Andola", "Yedrami"] },
        "Kalgi": { "Kasaba": ["Kalgi Town", "Gundgurthi"] },
        "Shahabad": { "Kasaba": ["Shahabad Town", "Bhankur"] }
    },
    "Kodagu": {
        "Madikeri": { "Kasaba": ["Madikeri Town", "Napoklu"], "Napoklu": ["Napoklu", "Balamuri"] },
        "Virajpet": { "Kasaba": ["Virajpet Town", "Ponnampet", "Ammathi"] },
        "Somwarpet": { "Kasaba": ["Somwarpet Town", "Shanivarsanthe", "Kushalnagar Town"] }
    },
    "Kolar": {
        "Kolar": { "Kasaba": ["Kolar City", "Vemagal"], "Vemagal": ["Vemagal", "Narasapura"] },
        "Malur": { "Kasaba": ["Malur Town", "Masti", "Lakkur"] },
        "Bangarapet": { "Kasaba": ["Bangarapet Town", "Kamasandra", "Budikote"] },
        "Mulbagal": { "Kasaba": ["Mulbagal Town", "Avani", "Tayalur"] },
        "Srinivaspur": { "Kasaba": ["Srinivaspur Town", "Ronur", "Yeldur"] }
    },
    "Koppal": {
        "Koppal": { "Kasaba": ["Koppal Town", "Irkalgada"], "Alwandi": ["Alwandi", "Munnirabad"] },
        "Gangavathi": { "Kasaba": ["Gangavathi City", "Karatagi", "Kanakagiri"] },
        "Kushtagi": { "Kasaba": ["Kushtagi Town", "Tawargera", "Hanumasagara"] },
        "Yelburga": { "Kasaba": ["Yelburga Town", "Kuknoor Town"] },
        "Kanakagiri": { "Kasaba": ["Kanakagiri Town", "Malagitti"] },
        "Karatagi": { "Kasaba": ["Karatagi Town", "Hulikihal"] },
        "Kuknoor": { "Kasaba": ["Kuknoor Town", "Yelburga"] }
    },
    "Mandya": {
        "Mandya": { "Kasaba": ["Mandya City", "Keragodu"], "Keragodu": ["Keragodu", "Holalu"] },
        "Maddur": { "Kasaba": ["Maddur Town", "Koppa", "Athagur"] },
        "Malavalli": { "Kasaba": ["Malavalli Town", "Halagur", "Kirugavalu"] },
        "Nagamangala": { "Kasaba": ["Nagamangala Town", "Bellur", "Bindiganavile"] },
        "Pandavapura": { "Kasaba": ["Pandavapura Town", "Melukote", "Chinna"] },
        "Krishnarajapet": { "Kasaba": ["KR Pet Town", "Bookanakere", "Akkihebbal"] },
        "Srirangapatna": { "Kasaba": ["Srirangapatna Town", "Arakere", "K Shettihalli"] }
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
        "T.Narsipur": { "Kasaba": ["T.Narsipur Town", "Bannur Town"], "Mugur": ["Mugur", "Sosale", "Talakadu"] },
        "Krishnarajanagara": { "Kasaba": ["KR Nagar Town", "Saligrama Town", "Mirle"] },
        "Periyapatna": { "Kasaba": ["Periyapatna Town", "Bettadapura", "Kittur"] },
        "Saragur": { "Kasaba": ["Saragur Town", "Hebbadi"] },
        "Heggadadevana Kote": { "Kasaba": ["HD Kote Town", "Sargur", "Antharasanthe"] }
    },
    "Raichur": {
        "Raichur": { "Kasaba": ["Raichur City", "Yeragera"], "Yeragera": ["Yeragera", "Deosugur"] },
        "Manvi": { "Kasaba": ["Manvi Town", "Sirwar", "Kallur"] },
        "Deodurg": { "Kasaba": ["Deodurg Town", "Jalatgiri"] },
        "Lingsugur": { "Kasaba": ["Lingsugur Town", "Mudgal Town", "Gurugunta"] },
        "Sindhanur": { "Kasaba": ["Sindhanur City", "Turvihal Town"] },
        "Maski": { "Kasaba": ["Maski Town", "Kavital Town"] },
        "Sirwar": { "Kasaba": ["Sirwar Town", "Mallat"] }
    },
    "Ramanagara": {
        "Ramanagara": { "Kasaba": ["Ramanagara Town", "Bidadi"], "Bidadi": ["Bidadi", "Harohalli"] },
        "Kanakapura": { "Kasaba": ["Kanakapura Town", "Sathnur", "Kodihalli", "Maralavadi"] },
        "Channapatna": { "Kasaba": ["Channapatna Town", "Mogarahalli", "Kootagal"] },
        "Magadi": { "Kasaba": ["Magadi Town", "Kudur", "Tavarekere"] }
    },
    "Shivamogga": {
        "Shivamogga": { "Kasaba": ["Shivamogga City", "Holenahalli"], "Kumsi": ["Kumsi", "Ayanur"] },
        "Sagara": { "Kasaba": ["Sagara Town", "Anandapura"], "Anandapura": ["Anandapura", "Iduvani"] },
        "Bhadravathi": { "Kasaba": ["Bhadravathi City", "Holehonnur"] },
        "Hosanagara": { "Kasaba": ["Hosanagara Town", "Ripponpet"] },
        "Shikaripura": { "Kasaba": ["Shikaripura Town", "Shiralkoppa Town"] },
        "Soraba": { "Kasaba": ["Soraba Town", "Anavatti Town"] },
        "Thirthahalli": { "Kasaba": ["Thirthahalli Town", "Agumbe"] }
    },
    "Tumakuru": {
        "Tumakuru": { "Kasaba": ["Tumakuru City", "Hirehalli"], "Bellavi": ["Bellavi", "Mallasandra"] },
        "Tiptur": { "Kasaba": ["Tiptur Town", "Honavalli", "Kibbanahalli"] },
        "Chikkanayakanahalli": { "Kasaba": ["CN Halli Town", "Huliyar Town"] },
        "Gubbi": { "Kasaba": ["Gubbi Town", "C.S. Pura", "Hagalavadi"] },
        "Koratagere": { "Kasaba": ["Koratagere Town", "Kolala"] },
        "Kunigal": { "Kasaba": ["Kunigal Town", "Huliyurdurga", "Amrutur"] },
        "Madhugiri": { "Kasaba": ["Madhugiri Town", "Kodigenahalli", "Itakadibbanahalli"] },
        "Pavagada": { "Kasaba": ["Pavagada Town", "Y.N. Hosakote"] },
        "Sira": { "Kasaba": ["Sira Town", "Bukkapatna"] },
        "Turuvekere": { "Kasaba": ["Turuvekere Town", "Dandinasivara"] }
    },
    "Udupi": {
        "Udupi": { "Kasaba": ["Udupi Town", "Malpe", "Manipal", "Shirva"], "Kaup": ["Kaup Town", "Padubidri", "Shirva"] },
        "Brahmavara": { "Kasaba": ["Brahmavara Town", "Mandarthi", "Kota"] },
        "Byndoor": { "Kasaba": ["Byndoor Town", "Kollur", "Shiroor"] },
        "Hebri": { "Kasaba": ["Hebri Town", "Mudradi"] },
        "Karkala": { "Kasaba": ["Karkala Town", "Bajagoli", "Mudur"] },
        "Kundapura": { "Kasaba": ["Kundapura Town", "Tallur", "Gangolli"] },
        "Kaup": { "Kasaba": ["Kaup Town", "Uchila"] }
    },
    "Uttara Kannada": {
        "Karwar": { "Kasaba": ["Karwar City", "Mallapur"], "Mallapur": ["Mallapur", "Kodasalli"] },
        "Kumta": { "Kasaba": ["Kumta Town", "Gokarna", "Mirjan"] },
        "Ankola": { "Kasaba": ["Ankola Town", "Belambar"] },
        "Bhatkal": { "Kasaba": ["Bhatkal Town", "Shirali"] },
        "Haliyal": { "Kasaba": ["Haliyal Town", "Dandeli City"] },
        "Honnavar": { "Kasaba": ["Honnavar Town", "Manki"] },
        "Joida": { "Kasaba": ["Joida Town", "Ulavi"] },
        "Mundgod": { "Kasaba": ["Mundgod Town", "Kattige"] },
        "Siddapur": { "Kasaba": ["Siddapur Town", "Kansur"] },
        "Sirsi": { "Kasaba": ["Sirsi Town", "Banavasi"] },
        "Yellapur": { "Kasaba": ["Yellapur Town", "Manchikeri"] }
    },
    "Vijayanagara": {
        "Hosapete": { "Kasaba": ["Hosapete City", "Kamalapura"], "Kamalapura": ["Kamalapura", "Hampi"] },
        "Harapanahalli": { "Kasaba": ["Harapanahalli Town", "Arasikere", "Chigateri"] },
        "Hadagali": { "Kasaba": ["Hadagali Town", "Hirehadagali"] },
        "Hagaribommanahalli": { "Kasaba": ["HB Halli Town", "Tambrahalli"] },
        "Kudligi": { "Kasaba": ["Kudligi Town", "Kotturu Town"] },
        "Kotturu": { "Kasaba": ["Kotturu Town", "Ujjini"] }
    },
    "Vijayapura": {
        "Vijayapura": { "Kasaba": ["Vijayapura City", "Tikota", "Mamadhapur"], "Babaleshwar": ["Babaleshwar", "Bhurat", "Sarwad"] },
        "Indi": { "Kasaba": ["Indi Town", "Loni", "Horti", "Zalki"] },
        "Sindhagi": { "Kasaba": ["Sindhagi Town", "Almel Town", "Devarahipparagi"] },
        "Basavana Bagevadi": { "Kasaba": ["Basavana Bagevadi Town", "Nidgundi Town", "Kolhar Town"] },
        "Muddebihal": { "Kasaba": ["Muddebihal Town", "Talikoti Town", "Nalatwad"] },
        "Babaleshwar": { "Kasaba": ["Babaleshwar Town", "Tikkota"] },
        "Talikota": { "Kasaba": ["Talikota Town", "Minajagi"] },
        "Devar Hippargi": { "Kasaba": ["Devar Hippargi Town", "Kalkeri"] }
    },
    "Yadgir": {
        "Yadgir": { "Kasaba": ["Yadgir City", "Gurmitkal"], "Gurmitkal": ["Gurmitkal", "Saidapur"] },
        "Shahapur": { "Kasaba": ["Shahapur", "Sagar", "Gogi"] },
        "Shorapur": { "Kasaba": ["Shorapur Town", "Kembhavi Town", "Hunasagi Town"] },
        "Gurumitkal": { "Kasaba": ["Gurumitkal Town", "Saidapur"] },
        "Vadagera": { "Kasaba": ["Vadagera Town", "Balichakra"] },
        "Hunsagi": { "Kasaba": ["Hunsagi Town", "Kodekal"] }
    }
};
