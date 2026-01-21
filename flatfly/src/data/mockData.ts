// Типы данных
export interface ApartmentItem {
    id: string;
    price: number;
    size: number;
    rooms: string;
    address: string;
    badges: string[];
    image: string;
    images: string[];
    title: string;
    description: string;
    beds: number;
    contactPhone: string;
    contactEmail: string;
}

export interface RoomItem {
    id: string;
    price: number;
    size: number;
    address: string;
    badges: string[];
    image: string;
    images: string[];
    title: string;
    description: string;
    beds: number;
    contactPhone: string;
    contactEmail: string;
}

export interface NeighbourItem {
    id: string;
    name: string;
    age: number;
    from: string;
    badges: string[];
    image: string;
    images: string[];
    title: string;
    description: string;
    contactPhone: string;
    contactEmail: string;
}

import furniture from "../assets/furniture.jpg";

// Данные для квартир
export const ApartmentList: ApartmentItem[] = [
    {
        id: "1",
        price: 500000,
        size: 57,
        rooms: `3+1kk`,
        address: `Habrmanova, Hradec Králové - Pražské Předměstí`,
        badges: [`VOLNÉ LŮŽKO`, `PET FRIENDLY`],
        image: furniture,
        images: [furniture, furniture, furniture],
        title: `Slunný byt 3+1kk na Vinohradech`,
        description: `Nabízím k pronájmu krásný byt 3+1kk v centru Hradce Králové. Byt se nachází v klidné lokalitě s výbornou dopravní dostupností.

Byt je plně vybavený a nachází se v něm:
- Obývací pokoj s kuchyní
- 2 ložnice
- Koupelna s vanou
- Balkon s výhledem na město

V okolí najdete:
- Obchody a restaurace
- MHD zastávka 2 minuty pěšky
- Základní škola
- Parky a rekreační zóny

Ideální pro rodinu nebo skupinu přátel. Možnost okamžitého nastěhování.`,
        beds: 3,
        contactPhone: "+420 736 103 242",
        contactEmail: "info@flatfly.cz"
    },
    {
        id: "2",
        price: 500000,
        size: 57,
        rooms: `3+1kk`,
        address: `Habrmanova, Hradec Králové - Pražské Předměstí`,
        badges: [`VOLNÉ LŮŽKO`, `PET FRIENDLY`],
        image: furniture,
        images: [furniture,furniture, furniture],
        title: `Slunný byt 3+1kk na Vinohradech`,
        description: `Nabízím k pronájmu krásný byt 3+1kk v centru Hradce Králové. Byt se nachází v klidné lokalitě s výbornou dopravní dostupností.

Byt je plně vybavený a nachází se v něm:
- Obývací pokoj s kuchyní
- 2 ložnice
- Koupelna s vanou
- Balkon s výhledem na město

V okolí najdete:
- Obchody a restaurace
- MHD zastávka 2 minuty pěšky
- Základní škola
- Parky a rekreační zóny

Ideální pro rodinu nebo skupinu přátel. Možnost okamžitého nastěhování.`,
        beds: 3,
        contactPhone: "+420 736 103 242",
        contactEmail: "info@flatfly.cz"
    },
    {
        id: "3",
        price: 500000,
        size: 57,
        rooms: `3+1kk`,
        address: `Habrmanova, Hradec Králové - Pražské Předměstí`,
        badges: [`VOLNÉ LŮŽKO`, `PET FRIENDLY`],
        image: furniture,
        images: [furniture, furniture,furniture],
        title: `Slunný byt 3+1kk na Vinohradech`,
        description: `Nabízím k pronájmu krásný byt 3+1kk v centru Hradce Králové. Byt se nachází v klidné lokalitě s výbornou dopravní dostupností.

Byt je plně vybavený a nachází se v něm:
- Obývací pokoj s kuchyní
- 2 ložnice
- Koupelna s vanou
- Balkon s výhledem na město

V okolí najdete:
- Obchody a restaurace
- MHD zastávka 2 minuty pěšky
- Základní škola
- Parky a rekreační zóny

Ideální pro rodinu nebo skupinu přátel. Možnost okamžitého nastěhování.`,
        beds: 3,
        contactPhone: "+420 736 103 242",
        contactEmail: "info@flatfly.cz"
    },
];

// Данные для комнат
export const RoomsList: RoomItem[] = [
    {
        id: "1",
        price: 500000,
        size: 57,
        address: `Habrmanova, Hradec Králové - Pražské Předměstí`,
        badges: [`VOLNÉ LŮŽKO`, `PET FRIENDLY`],
        image: furniture,
        images: [furniture, furniture, furniture],
        title: "Pokoje v bytě 3+1kk",
        description: `Hledám spolubydlícího do sdíleného bytu 3+1kk. Byt se nachází v centru Hradce Králové, 5 minut od hlavního nádraží.

K dispozici je:
- Vlastní pokoj 57 m²
- Sdílená kuchyně a obývák
- Koupelna s vanou
- Balkon

Současní spolubydlící:
- 2 studenti (23 a 25 let)
- Klidní, čistotní, respektující soukromí

Hledáme někoho, kdo:
- Je čistotný a respektuje společné prostory
- Je otevřený komunikaci
- Má zájem o přátelskou atmosféru

Možnost okamžitého nastěhování.`,
        beds: 1,
        contactPhone: "+420 736 103 242",
        contactEmail: "info@flatfly.cz"
    },
    {
        id: "2",
        price: 500000,
        size: 57,
        address: `Habrmanova, Hradec Králové - Pražské Předměstí`,
        badges: [`VOLNÉ LŮŽKO`, `PET FRIENDLY`],
        image: furniture,
        images: [furniture, furniture, furniture],
        title: "Pokoje v bytě 3+1kk",
        description: `Hledám spolubydlícího do sdíleného bytu 3+1kk. Byt se nachází v centru Hradce Králové, 5 minut od hlavního nádraží.

K dispozici je:
- Vlastní pokoj 57 m²
- Sdílená kuchyně a obývák
- Koupelna s vanou
- Balkon

Současní spolubydlící:
- 2 studenti (23 a 25 let)
- Klidní, čistotní, respektující soukromí

Hledáme někoho, kdo:
- Je čistotný a respektuje společné prostory
- Je otevřený komunikaci
- Má zájem o přátelskou atmosféru

Možnost okamžitého nastěhování.`,
        beds: 1,
        contactPhone: "+420 736 103 242",
        contactEmail: "info@flatfly.cz"
    },
    {
        id: "3",
        price: 500000,
        size: 57,
        address: `Habrmanova, Hradec Králové - Pražské Předměstí`,
        badges: [`VOLNÉ LŮŽKO`, `PET FRIENDLY`],
        image: furniture,
        images: [furniture, furniture, furniture],
        title: "Pokoje v bytě 3+1kk",
        description: `Hledám spolubydlícího do sdíleného bytu 3+1kk. Byt se nachází v centru Hradce Králové, 5 minut od hlavního nádraží.

K dispozici je:
- Vlastní pokoj 57 m²
- Sdílená kuchyně a obývák
- Koupelna s vanou
- Balkon

Současní spolubydlící:
- 2 studenti (23 a 25 let)
- Klidní, čistotní, respektující soukromí

Hledáme někoho, kdo:
- Je čistotný a respektuje společné prostory
- Je otevřený komunikaci
- Má zájem o přátelskou atmosféru

Možnost okamžitého nastěhování.`,
        beds: 1,
        contactPhone: "+420 736 103 242",
        contactEmail: "info@flatfly.cz"
    },
];

// Данные для соседей
export const NeighboursList: NeighbourItem[] = [
    {
        id: "1",
        name: `Sardor`,
        age: 23,
        from: `Navoiy`,
        badges: [`PES`, `EXTROVERT`, `ZAMĚSTNANÝ`],
        image: furniture,
        images: [furniture, furniture, furniture],
        title: "Hledám spolubydlícího",
        description: `Ahoj! Jmenuji se Sardor a hledám spolubydlícího do bytu v Hradci Králové.

O mně:
- Je mi 23 let
- Pracuji jako softwarový vývojář
- Mám psa, který je velmi přátelský
- Jsem extrovert a rád trávím čas s lidmi
- Respektuji soukromí a čistotu

Hledám někoho, kdo:
- Je otevřený komunikaci
- Respektuje společné prostory
- Má rád zvířata (mám psa)
- Je přátelský a má smysl pro humor

Byt se nachází v centru města s výbornou dopravní dostupností. Pokud máš zájem, napiš mi!`,
        contactPhone: "+420 736 103 242",
        contactEmail: "info@flatfly.cz"
    },
    {
        id: "2",
        name: `Sardor`,
        age: 23,
        from: `Navoiy`,
        badges: [`PES`, `EXTROVERT`, `ZAMĚSTNANÝ`],
        image: furniture,
        images: [furniture, furniture, furniture],
        title: "Hledám spolubydlícího",
        description: `Ahoj! Jmenuji se Sardor a hledám spolubydlícího do bytu v Hradci Králové.

O mně:
- Je mi 23 let
- Pracuji jako softwarový vývojář
- Mám psa, který je velmi přátelský
- Jsem extrovert a rád trávím čas s lidmi
- Respektuji soukromí a čistotu

Hledám někoho, kdo:
- Je otevřený komunikaci
- Respektuje společné prostory
- Má rád zvířata (mám psa)
- Je přátelský a má smysl pro humor

Byt se nachází v centru města s výbornou dopravní dostupností. Pokud máš zájem, napiš mi!`,
        contactPhone: "+420 736 103 242",
        contactEmail: "info@flatfly.cz"
    },
    {
        id: "3",
        name: `Sardor`,
        age: 23,
        from: `Navoiy`,
        badges: [`PES`, `EXTROVERT`, `ZAMĚSTNANÝ`],
        image: furniture,
        images: [furniture, furniture, furniture],
        title: "Hledám spolubydlícího",
        description: `Ahoj! Jmenuji se Sardor a hledám spolubydlícího do bytu v Hradci Králové.

O mně:
- Je mi 23 let
- Pracuji jako softwarový vývojář
- Mám psa, který je velmi přátelský
- Jsem extrovert a rád trávím čas s lidmi
- Respektuji soukromí a čistotu

Hledám někoho, kdo:
- Je otevřený komunikaci
- Respektuje společné prostory
- Má rád zvířata (mám psa)
- Je přátelský a má smysl pro humor

Byt se nachází v centru města s výbornou dopravní dostupností. Pokud máš zájem, napiš mi!`,
        contactPhone: "+420 736 103 242",
        contactEmail: "info@flatfly.cz"
    },
    {
        id: "4",
        name: `Sardor`,
        age: 23,
        from: `Navoiy`,
        badges: [`PES`, `EXTROVERT`, `ZAMĚSTNANÝ`],
        image: furniture,
        images: [furniture, furniture, furniture],
        title: "Hledám spolubydlícího",
        description: `Ahoj! Jmenuji se Sardor a hledám spolubydlícího do bytu v Hradci Králové.

O mně:
- Je mi 23 let
- Pracuji jako softwarový vývojář
- Mám psa, který je velmi přátelský
- Jsem extrovert a rád trávím čas s lidmi
- Respektuji soukromí a čistotu

Hledám někoho, kdo:
- Je otevřený komunikaci
- Respektuje společné prostory
- Má rád zvířata (mám psa)
- Je přátelský a má smysl pro humor

Byt se nachází v centru města s výbornou dopravní dostupností. Pokud máš zájem, napiš mi!`,
        contactPhone: "+420 736 103 242",
        contactEmail: "info@flatfly.cz"
    },
];
