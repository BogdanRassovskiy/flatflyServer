from django.db import migrations


FAQ_ITEMS = [
    {
        "faq_id": 1,
        "keys": ["service", "how-it-works", "platform", "rental"],
        "translations": {
            "ru": {
                "question": "Что это за сервис и как он работает?",
                "answer": "Наш сервис напрямую связывает арендаторов и арендодателей. Арендаторы могут просматривать доступные объекты и отправлять заявки, а арендодатели — размещать объявления и выбирать подходящих кандидатов. Мы упрощаем процесс поиска и сдачи жилья без необходимости обращаться к посредникам.",
            },
            "en": {
                "question": "What is this service and how does it work?",
                "answer": "Our service connects tenants and landlords directly. Tenants can browse available properties and send requests, while landlords can publish listings and choose suitable candidates. We simplify the process of finding and renting out housing without the need for intermediaries.",
            },
            "cz": {
                "question": "Co je to za službu a jak funguje?",
                "answer": "Naše služba přímo propojuje nájemce a pronajímatele. Nájemci si mohou prohlížet dostupné nabídky a posílat žádosti, zatímco pronajímatelé mohou zveřejňovat inzeráty a vybírat vhodné kandidáty. Zjednodušujeme proces hledání a pronájmu bydlení bez potřeby prostředníků.",
            },
        },
    },
    {
        "faq_id": 2,
        "keys": ["pricing", "free", "payment", "premium"],
        "translations": {
            "ru": {
                "question": "Нужно ли платить за использование сервиса?",
                "answer": "Регистрация и использование основных функций сервиса бесплатны. Вы можете бесплатно просматривать объявления, публиковать предложения и общаться с другими пользователями. Дополнительные платные функции могут быть доступны для повышения видимости объявления или ускорения поиска.",
            },
            "en": {
                "question": "Do I need to pay to use the service?",
                "answer": "Registration and the core features of the service are free. You can browse listings, publish offers, and communicate with other users at no cost. Optional paid features may be available to improve listing visibility or speed up the search process.",
            },
            "cz": {
                "question": "Je používání služby zpoplatněné?",
                "answer": "Registrace a používání základních funkcí služby je zdarma. Můžete zdarma prohlížet inzeráty, zveřejňovat nabídky a komunikovat s ostatními uživateli. Volitelné placené funkce mohou být dostupné pro zvýšení viditelnosti inzerátu nebo urychlení hledání.",
            },
        },
    },
    {
        "faq_id": 3,
        "keys": ["contact", "chat", "messages", "communication"],
        "translations": {
            "ru": {
                "question": "Как связаться с другой стороной?",
                "answer": "После регистрации вы можете отправлять сообщения напрямую через встроенный чат. Это позволяет безопасно обсудить детали аренды, задать вопросы и договориться о просмотре жилья.",
            },
            "en": {
                "question": "How can I contact the other party?",
                "answer": "After registration, you can send messages directly through the built-in chat. This allows you to safely discuss rental details, ask questions, and arrange a property viewing.",
            },
            "cz": {
                "question": "Jak kontaktovat druhou stranu?",
                "answer": "Po registraci můžete posílat zprávy přímo přes vestavěný chat. To vám umožní bezpečně prodiskutovat detaily pronájmu, položit otázky a domluvit si prohlídku bydlení.",
            },
        },
    },
    {
        "faq_id": 4,
        "keys": ["verification", "safety", "checks", "listings"],
        "translations": {
            "ru": {
                "question": "Проверяются ли пользователи и объявления?",
                "answer": "Мы применяем автоматические и ручные методы проверки для выявления подозрительной активности. Однако мы рекомендуем пользователям соблюдать осторожность, лично осматривать жильё и подписывать официальный договор аренды перед оплатой.",
            },
            "en": {
                "question": "Are users and listings verified?",
                "answer": "We use automated and manual verification methods to detect suspicious activity. However, we recommend that users stay cautious, inspect properties in person, and sign an official rental agreement before making any payment.",
            },
            "cz": {
                "question": "Jsou uživatelé a inzeráty ověřovány?",
                "answer": "Používáme automatické i manuální metody ověřování k odhalení podezřelé aktivity. Přesto doporučujeme uživatelům být opatrní, osobně si bydlení prohlédnout a před platbou podepsat oficiální nájemní smlouvu.",
            },
        },
    },
    {
        "faq_id": 5,
        "keys": ["commission", "agency", "fees", "direct"],
        "translations": {
            "ru": {
                "question": "Нужно ли платить комиссию посредникам?",
                "answer": "Нет, сервис создан для прямого взаимодействия между арендатором и арендодателем. Это позволяет избежать комиссий агентств, которые часто составляют значительную сумму.",
            },
            "en": {
                "question": "Do I need to pay a commission to intermediaries?",
                "answer": "No, the service is designed for direct interaction between tenant and landlord. This helps avoid agency commissions, which are often a significant expense.",
            },
            "cz": {
                "question": "Je nutné platit provizi zprostředkovatelům?",
                "answer": "Ne, služba je vytvořena pro přímou komunikaci mezi nájemcem a pronajímatelem. Díky tomu se vyhnete provizím realitních agentur, které bývají často vysoké.",
            },
        },
    },
    {
        "faq_id": 6,
        "keys": ["publish", "listing", "create-ad", "landlord"],
        "translations": {
            "ru": {
                "question": "Как разместить объявление о сдаче жилья?",
                "answer": "После регистрации вы можете создать объявление, указав описание, цену, местоположение и добавив фотографии. Объявление станет доступным для арендаторов сразу после публикации.",
            },
            "en": {
                "question": "How do I publish a rental listing?",
                "answer": "After registration, you can create a listing by adding a description, price, location, and photos. The listing becomes available to tenants immediately after publication.",
            },
            "cz": {
                "question": "Jak zveřejnit inzerát na pronájem bydlení?",
                "answer": "Po registraci můžete vytvořit inzerát, uvést popis, cenu, lokalitu a přidat fotografie. Inzerát bude nájemcům dostupný ihned po zveřejnění.",
            },
        },
    },
    {
        "faq_id": 7,
        "keys": ["reliable", "tenant", "housing", "selection"],
        "translations": {
            "ru": {
                "question": "Как выбрать надёжного арендатора или жильё?",
                "answer": "Вы можете просматривать профили пользователей, их активность и предоставленную информацию. Мы рекомендуем общаться заранее, задавать вопросы и заключать официальный договор аренды.",
            },
            "en": {
                "question": "How do I choose a reliable tenant or property?",
                "answer": "You can review user profiles, their activity, and the information they provide. We recommend communicating in advance, asking questions, and signing an official rental agreement.",
            },
            "cz": {
                "question": "Jak vybrat spolehlivého nájemce nebo bydlení?",
                "answer": "Můžete si prohlížet profily uživatelů, jejich aktivitu a poskytnuté informace. Doporučujeme komunikovat předem, klást otázky a uzavřít oficiální nájemní smlouvu.",
            },
        },
    },
    {
        "faq_id": 8,
        "keys": ["speed", "timing", "responses", "search"],
        "translations": {
            "ru": {
                "question": "Как быстро можно найти жильё или арендатора?",
                "answer": "Во многих случаях первые отклики поступают в течение 24–72 часов. Скорость зависит от цены, местоположения, спроса и качества заполнения профиля или объявления.",
            },
            "en": {
                "question": "How quickly can I find housing or a tenant?",
                "answer": "In many cases, the first responses arrive within 24–72 hours. The speed depends on price, location, demand, and the quality of your profile or listing.",
            },
            "cz": {
                "question": "Jak rychle lze najít bydlení nebo nájemce?",
                "answer": "V mnoha případech přijdou první reakce během 24–72 hodin. Rychlost závisí na ceně, lokalitě, poptávce a kvalitě vyplnění profilu nebo inzerátu.",
            },
        },
    },
    {
        "faq_id": 9,
        "keys": ["edit", "delete", "listing-management", "dashboard"],
        "translations": {
            "ru": {
                "question": "Можно ли редактировать или удалить объявление?",
                "answer": "Да, вы можете в любое время изменить информацию, обновить фотографии или удалить объявление через свой личный кабинет.",
            },
            "en": {
                "question": "Can I edit or delete a listing?",
                "answer": "Yes, you can update information, refresh photos, or delete your listing at any time through your personal account.",
            },
            "cz": {
                "question": "Lze inzerát upravit nebo smazat?",
                "answer": "Ano, kdykoli můžete upravit informace, aktualizovat fotografie nebo inzerát odstranit ve svém uživatelském účtu.",
            },
        },
    },
    {
        "faq_id": 10,
        "keys": ["security", "data-protection", "safe-payments", "trust"],
        "translations": {
            "ru": {
                "question": "Безопасно ли пользоваться сервисом?",
                "answer": "Мы используем современные технологии для защиты данных пользователей и обеспечения безопасного общения. Тем не менее, мы рекомендуем не переводить деньги заранее без подписанного договора и подтверждения личности другой стороны.",
            },
            "en": {
                "question": "Is it safe to use the service?",
                "answer": "We use modern technologies to protect user data and ensure secure communication. Nevertheless, we recommend not sending money in advance without a signed agreement and identity confirmation from the other party.",
            },
            "cz": {
                "question": "Je používání služby bezpečné?",
                "answer": "Používáme moderní technologie pro ochranu uživatelských dat a bezpečnou komunikaci. Přesto doporučujeme neposílat peníze předem bez podepsané smlouvy a ověření identity druhé strany.",
            },
        },
    },
]


def seed_faqs(apps, schema_editor):
    FAQ = apps.get_model("article", "FAQ")

    for item in FAQ_ITEMS:
        faq_id = item["faq_id"]
        keys = item["keys"]
        for language, payload in item["translations"].items():
            FAQ.objects.update_or_create(
                faq_id=faq_id,
                language=language,
                defaults={
                    "question": payload["question"],
                    "answer": payload["answer"],
                    "keys": keys,
                },
            )


def unseed_faqs(apps, schema_editor):
    FAQ = apps.get_model("article", "FAQ")
    FAQ.objects.filter(faq_id__in=[item["faq_id"] for item in FAQ_ITEMS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("article", "0002_faq"),
    ]

    operations = [
        migrations.RunPython(seed_faqs, unseed_faqs),
    ]
