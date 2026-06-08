// Dictionarul de traduceri (DOAR web). Scris manual: fiecare cheie are RO + EN.
// Cand adaugi un text nou pe web, adaugi aici o cheie si o folosesti cu t("cheie").
export type Lang = "ro" | "en";

export const translations: Record<string, Record<Lang, string>> = {
  // Tab-uri (navbar)
  "tabs.home":     { ro: "Acasă",     en: "Home" },
  "tabs.map":      { ro: "Hartă",     en: "Map" },
  "tabs.canteen":  { ro: "Cantină",   en: "Cafeteria" },
  "tabs.reports":  { ro: "Sesizări",  en: "Reports" },
  "tabs.more":     { ro: "Mai multe", en: "More" },

  // Pagina de acasa
  "home.today":     { ro: "Astăzi, 27 mai", en: "Today, May 27" },
  "home.discover":  { ro: "Descoperă",      en: "Discover" },
  "home.news":      { ro: "Noutăți",        en: "News" },
  "home.events":    { ro: "Evenimente",     en: "Events" },
  "home.faculties": { ro: "Facultăți",      en: "Faculties" },

  // Comun
  "common.seeMore": { ro: "Vezi mai multe >", en: "See more >" },

  // Pagina "Mai multe"
  "more.title": { ro: "Mai multe", en: "More" },

  // Cantina
  "canteen.title":   { ro: "Cantina",  en: "Cafeteria" },
  "days.today":      { ro: "Azi",      en: "Today" },
  "days.luni":       { ro: "Luni",     en: "Monday" },
  "days.marti":      { ro: "Marți",    en: "Tuesday" },
  "days.miercuri":   { ro: "Miercuri", en: "Wednesday" },
  "days.joi":        { ro: "Joi",      en: "Thursday" },
  "days.vineri":     { ro: "Vineri",   en: "Friday" },

  "canteen.cat.Meniul Zilei":     { ro: "Meniul Zilei",     en: "Daily Menu" },
  "canteen.cat.Ciorbe și Supe":   { ro: "Ciorbe și Supe",   en: "Soups & Broths" },
  "canteen.cat.Preparate Carne":  { ro: "Preparate Carne",  en: "Meat Dishes" },
  "canteen.cat.Salate / Sosuri":  { ro: "Salate / Sosuri",  en: "Salads / Sauces" },
  "canteen.cat.Garnituri":        { ro: "Garnituri",        en: "Side Dishes" },
  "canteen.cat.Desert":           { ro: "Desert",           en: "Dessert" },

  // Pagina de categorie
  "category.default":      { ro: "Categorie",          en: "Category" },
  "category.allFaculties": { ro: "Toate Facultățile",  en: "All Faculties" },
  "category.empty":        { ro: "Nu există elemente în această categorie.", en: "No items in this category." },

  // Pagina de vizualizare
  "view.faculty":            { ro: "Facultate",              en: "Faculty" },
  "view.category":           { ro: "Categorie",              en: "Category" },
  "view.title":              { ro: "Titlu",                  en: "Title" },
  "view.unknownDate":        { ro: "Dată necunoscută",       en: "Unknown date" },
  "view.eventInfo":          { ro: "Informații eveniment",   en: "Event information" },
  "view.from":               { ro: "De pe",                  en: "From" },
  "view.to":                 { ro: "Până la",                en: "Until" },
  "view.noLocation":         { ro: "Locație nespecificată",  en: "Location not specified" },
  "view.contactLocation":    { ro: "Contact și Locație",     en: "Contact & Location" },
  "view.address":            { ro: "Adresă",                 en: "Address" },
  "view.notSpecified":       { ro: "Nespecificată",          en: "Not specified" },
  "view.phone":              { ro: "Telefon",                en: "Phone" },
  "view.website":            { ro: "Website",                en: "Website" },
  "view.aboutEvent":         { ro: "Despre eveniment",       en: "About the event" },
  "view.aboutFaculty":       { ro: "Despre facultate",       en: "About the faculty" },
  "view.announcementDetails":{ ro: "Detalii anunț",          en: "Announcement details" },
  "view.noContent":          { ro: "Conținutul nu este disponibil.", en: "Content is not available." },
  "view.callTitle":          { ro: "Contact Facultate",      en: "Faculty contact" },
  "view.callMessage":        { ro: "Doriți să apelați numărul", en: "Do you want to call" },
  "view.cancel":             { ro: "Anulează",               en: "Cancel" },
  "view.call":               { ro: "Sună",                   en: "Call" },

  // Autentificare
  "auth.login":           { ro: "Autentificare", en: "Login" },
  "auth.subtitle":        { ro: "Introdu datele pentru a intra în cont", en: "Enter your details to sign in" },
  "auth.email":           { ro: "Email",   en: "Email" },
  "auth.password":        { ro: "Parolă",  en: "Password" },
  "auth.emailPlaceholder":{ ro: "exemplu@ugal.ro", en: "example@ugal.ro" },
  "auth.errEmailRequired":{ ro: "Email-ul este obligatoriu.", en: "Email is required." },
  "auth.errEmailInvalid": { ro: "Formatul email-ului este invalid.", en: "Invalid email format." },
  "auth.errPasswordRequired": { ro: "Parola este obligatorie.", en: "Password is required." },
  "auth.errPasswordShort":    { ro: "Parola trebuie să aibă cel puțin 6 caractere.", en: "Password must be at least 6 characters." },
};
