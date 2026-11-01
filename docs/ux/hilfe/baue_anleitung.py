# Baut die Kurzanleitung (Fragen & Antworten) als HTML; Chrome druckt sie als PDF.
# Koordinaten der Ausschnitte und Markierungen in Pixeln der Vorschaubilder (klein/).
import html, pathlib, sys

BASIS = pathlib.Path(__file__).parent
MASSE = {}
for zeile in (BASIS / "masse.txt").read_text().splitlines():
    n, b, h = zeile.split()
    MASSE[n] = (int(b), int(h))


def bild(name, aus, marken=(), max_breite="80%"):
    """aus = (x1, y1, x2, y2) Ausschnitt, marken = [(x1, y1, x2, y2, nummer)]"""
    B, H = MASSE[name]
    x1, y1, x2, y2 = aus
    w, h = x2 - x1, y2 - y1
    img = (f'<img src="jpg/{name}.jpg" alt="" style="width:{B / w * 100:.3f}%;'
           f'left:{-x1 / w * 100:.3f}%;top:{-y1 / h * 100:.3f}%">')
    mk = ""
    for mx1, my1, mx2, my2, nr in marken:
        mk += (f'<span class="marke" style="left:{(mx1 - x1) / w * 100:.2f}%;top:{(my1 - y1) / h * 100:.2f}%;'
               f'width:{(mx2 - mx1) / w * 100:.2f}%;height:{(my2 - my1) / h * 100:.2f}%">'
               + (f'<b>{nr}</b>' if nr else "") + "</span>")
    return (f'<div class="shot" style="aspect-ratio:{w}/{h};max-width:{max_breite}">{img}{mk}</div>')


FRAGEN = []
HOME_BILD = None
HANDY_BILD = None


def frage(titel, text, *bilder, gruppe=""):
    FRAGEN.append((gruppe, titel, text, bilder))


# --------------------------------------------------------------- Inhalte
# Home an einem Unterrichtstag: Code von Production, Staging-Daten, simulierte Zeit 02.11. 12:30.
HOME_BILD = bild("02_home_tag", (90, 0, 1010, 805), [(100, 259, 693, 518, 1), (100, 545, 1000, 799, 2)])
HANDY_BILD = bild("12_mobil_home_tag", (0, 0, 508, 1100), [(0, 1022, 508, 1100, 1)], max_breite="34%")
G1 = "Loslegen"
frage("Wie melde ich mich an?",
      """<ol><li>Öffne <b>learn.climatejobsacademy.com</b>.</li>
<li>Gib deine E-Mail-Adresse ein und tippe auf <b>Login-Link anfordern</b> <span class="nr">1</span>.</li>
<li>Öffne die E-Mail und tippe auf den Link. Fertig, du bist angemeldet.</li></ol>
<p>Du brauchst <b>kein Passwort</b>. Der Link gilt nur kurz und nur einmal. Kommt keine E-Mail an, schau im Spam-Ordner nach oder fordere einfach einen neuen Link an.</p>""",
      bild("01_login", (560, 150, 1040, 470), [(632, 322, 974, 446, 1)], max_breite="55%"), gruppe=G1)

frage("Was zeigt mir die Startseite „Home“?",
      """<p>Home zeigt dir, <b>was heute dran ist</b>.</p>
<ul><li><span class="nr">1</span> Die große Karte: dein nächster Termin oder deine Aufgabe für heute, mit dem passenden Knopf, z. B. <b>Zum Live-Unterricht</b>. Ist heute frei, steht hier, wann es weitergeht.</li>
<li><span class="nr">2</span> Deine Kompetenzen im aktuellen Modul und wie weit du bist.</li></ul>
<p>Oben findest du die vier Bereiche <b>Home, Stundenplan, Kompetenzen, Programm</b>. Am Handy stehen sie unten am Bildschirmrand.</p>""",
      HOME_BILD, gruppe=G1)

frage("Kann ich die Plattform am Handy nutzen?",
      """<p>Ja. Öffne die Adresse einfach im Browser deines Handys. Die vier Bereiche findest du dort <b>unten</b> <span class="nr">1</span>.</p>
<p><b>Tipp:</b> Leg dir die Plattform auf den Startbildschirm.</p>
<ul><li><b>iPhone (Safari):</b> Teilen-Symbol → „Zum Home-Bildschirm“</li>
<li><b>Android (Chrome):</b> Menü ⋮ → „Zum Startbildschirm hinzufügen“</li></ul>""",
      HANDY_BILD, gruppe=G1)

G2 = "Lernen"
frage("Wie trete ich dem Live-Unterricht bei?",
      """<p>Der Live-Unterricht findet online statt. So kommst du hinein:</p>
<ul><li><b>Auf Home:</b> Am Tag des Unterrichts zeigt die große Karte <b>Zum Live-Unterricht</b>.</li>
<li><b>Im Stundenplan:</b> Ab 15 Minuten vor Beginn führt dich ein Klick auf den Termin direkt in den Live-Raum.</li>
<li><b>In der Lektion:</b> Tippe auf <b>Beitreten</b> <span class="nr">1</span>.</li></ul>
<p>Der Live-Raum öffnet sich in einem neuen Fenster. Am besten mit Kopfhörern und einige Minuten vor Beginn.</p>""",
      bild("06_lektion_live", (230, 230, 870, 432), [(378, 361, 499, 405, 1)], max_breite="72%"), gruppe=G2)

frage("Wie lese ich meinen Stundenplan?",
      """<ul><li><span class="nr">1</span> Wechsle zwischen <b>Tag, Woche und Monat</b>. Mit den Pfeilen blätterst du vor und zurück.</li>
<li><span class="nr">2</span> Ein Klick auf einen Termin öffnet die Lektion.</li>
<li><span class="nr">3</span> Unter <b>Flexibel</b> stehen Aufgaben ohne feste Uhrzeit: <b>Wissen festigen</b> und <b>Fachsprache</b>. Die machst du, wann es dir passt.</li></ul>
<div class="farben"><span><i style="background:#6e44d6"></i>Lila = Live-Unterricht (online)</span><span><i style="background:#b9501e"></i>Orange = Praxis (vor Ort)</span><span><i style="background:#239669"></i>Grün = Selbstlernen</span></div>""",
      bild("03_stundenplan_woche", (103, 207, 997, 832), [(796, 228, 979, 265, 1), (183, 550, 333, 698, 2), (115, 722, 975, 810, 3)]), gruppe=G2)

frage("Was ist an einem Praxistag?",
      """<p>An Praxistagen arbeitest du <b>vor Ort in der Werkstatt oder im Betrieb</b>. Sie sind im Stundenplan <b>orange</b>.</p>
<p>Im Termin <span class="nr">1</span> stehen Uhrzeit, Ort, die Aufgabe und wer dich begleitet. Tippe auf den Tag, dann siehst du alles in der Tagesansicht. Was du in der Praxis gezeigt hast, bestätigt deine Trainer:in. Dann zählt es zu deinen Kompetenzen.</p>""",
      bild("15_stundenplan_praxiswoche", (103, 207, 997, 740), [(184, 366, 333, 604, 1)], max_breite="72%"), gruppe=G2)

frage("Was bedeutet „Wissen festigen“?",
      """<p>Zu jedem Live-Unterricht gehört eine Selbstlern-Einheit <b>Wissen festigen</b>. Darin wiederholst du das Wichtigste, lernst die Begriffe und prüfst dich mit einem kurzen Quiz.</p>
<ul><li>Du findest sie im Stundenplan unter <b>Flexibel</b> und in der Live-Lektion über den Knopf <b>Wissen festigen</b>.</li>
<li>Oben siehst du, in welchem Kapitel du bist und wie weit <span class="nr">1</span>. Mit <b>Weiter</b> geht es zum nächsten Schritt.</li>
<li>Du kannst jederzeit aufhören und später weitermachen.</li></ul>""",
      bild("07_lektion_selbstlernen", (230, 120, 870, 680), [(232, 260, 868, 300, 1)], max_breite="62%"), gruppe=G2)

frage("Was ist „Fachsprache“?",
      """<p>In <b>Fachsprache</b> lernst du in etwa 15 Minuten die wichtigsten Fachwörter zum Thema des Tages: mit Bild, Erklärung und Beispielsatz.</p>
<ul><li>Mit dem Lautsprecher-Symbol <span class="nr">1</span> hörst du, wie man das Wort ausspricht.</li>
<li>Danach folgen ein kurzes Quiz und Übungen mit Sätzen.</li></ul>""",
      bild("16_fachsprache", (230, 140, 870, 700), [(780, 350, 826, 394, 1)], max_breite="62%"), gruppe=G2)

frage("Wo finde ich die Unterlagen zur Lektion?",
      """<p>Öffne die Lektion, zum Beispiel aus dem Stundenplan. Unter <b>Zum Nachlesen</b> <span class="nr">1</span> findest du die Unterlagen zum Unterricht. Ein Tipp öffnet sie, du kannst sie ansehen und herunterladen.</p>""",
      bild("06_lektion_live", (230, 435, 870, 600), [(232, 466, 868, 598, 1)], max_breite="72%"), gruppe=G2)

frage("Wie stelle ich eine Frage zur Lektion?",
      """<p>Unten in jeder Live-Lektion gibt es <b>Fragen zur Lektion</b> <span class="nr">1</span>. Schreib deine Frage ins Feld und tippe auf den Pfeil. Deine Trainer:in und deine Kohorte sehen sie und können antworten.</p>
<p>Mit dem Pfeil-Kreis oben rechts holst du neue Antworten. Bitte schreib keine sensiblen Daten und keine Daten anderer Personen.</p>""",
      bild("06_lektion_live", (230, 605, 870, 800), [(254, 676, 846, 724, 1)], max_breite="72%"), gruppe=G2)

G3 = "Fortschritt und Programm"
frage("Was sind Kompetenzen und wie wächst mein Fortschritt?",
      """<p>Eine <b>Kompetenz</b> ist etwas, das du am Ende sicher kannst, z. B. „Fünf Sicherheitsregeln anwenden“. Jede Kompetenz besteht aus mehreren <b>Kompetenzschritten</b>.</p>
<p>Der Ring <span class="nr">1</span> zeigt, wie viele Schritte du schon erreicht hast. Ein Schritt zählt, wenn</p>
<ul><li>du eine Selbstlern-Einheit abgeschlossen hast,</li><li>deine Teilnahme am Live-Unterricht bestätigt ist oder</li><li>deine Trainer:in eine Praxisaufgabe bestätigt hat.</li></ul>
<p>Tippe auf eine Kompetenz: Unter <b>Hier lernst du das</b> <span class="nr">2</span> siehst du, in welchen Lektionen und Praxisaufgaben du sie übst.</p>""",
      bild("08_kompetenzen", (516, 20, 1100, 480), [(566, 102, 670, 208, 1), (568, 330, 1048, 476, 2)], max_breite="62%"), gruppe=G3)

frage("Wo sehe ich mein Programm und meine Module?",
      """<p>Unter <b>Programm</b> siehst du deinen ganzen Weg durch die Ausbildung.</p>
<ul><li><span class="nr">1</span> <b>Hier bist du</b> zeigt dein aktuelles Modul.</li>
<li><span class="nr">2</span> Darunter: wie viele Kompetenzschritte und Lerntage du im Modul schon geschafft hast.</li>
<li>Ein Klick auf ein Modul öffnet seine Inhalte, Woche für Woche mit allen Lektionen.</li></ul>""",
      bild("09_programm", (100, 225, 1000, 705), [(252, 300, 396, 466, 1), (125, 585, 975, 650, 2)]), gruppe=G3)

frage("Wer ist in meiner Kohorte und wer sind meine Ansprechpersonen?",
      """<p>Ganz unten auf der Seite <b>Programm</b> siehst du deine <b>Kohorte</b>, also die Gruppe, mit der du lernst <span class="nr">1</span>, und deine <b>Ansprechpersonen</b> <span class="nr">2</span>, zum Beispiel deine Trainer:innen.</p>""",
      bild("09_programm", (100, 720, 1000, 945), [(104, 724, 452, 940, 1), (474, 724, 996, 940, 2)]), gruppe=G3)

G4 = "Austausch und Hilfe"
frage("Wie funktioniert der Chat?",
      """<p>Über den runden lila Knopf unten rechts öffnest du den <b>Chat deiner Kohorte</b>. Eine Zahl am Knopf zeigt neue Nachrichten.</p>
<ul><li><b>Ankündigungen:</b> Hier schreiben deine Trainer:innen und das Team der Akademie. Du liest mit.</li>
<li><b>Treffpunkt:</b> Hier tauschst du dich mit deiner Kohorte aus.</li></ul>
<p>Bitte beachte die <b>Chat-Regeln</b> (Link unten im Chat-Fenster).</p>""",
      bild("11_chat_kanaele", (722, 172, 1080, 420), [], max_breite="46%"), gruppe=G4)

frage("Wo ändere ich mein Profil oder melde mich ab?",
      """<p>Tippe oben rechts auf dein Bild oder deine Initialen. Dort siehst du dein Programm und deine Kohorte, kannst dein <b>Profil bearbeiten</b> <span class="nr">1</span> (z. B. ein Foto hochladen) und dich <b>abmelden</b> <span class="nr">2</span>.</p>""",
      bild("14_konto_menue", (730, 0, 1010, 330), [(745, 240, 990, 272, 1), (745, 278, 990, 310, 2)], max_breite="40%"), gruppe=G4)

frage("Wer hilft mir, wenn etwas nicht klappt?",
      """<p>Melde dich bei <b>Malte</b>: <b>malte@climatejobsacademy.com</b></p>
<p>Bei Fragen zum Inhalt einer Lektion hilft dir <b>Fragen zur Lektion</b>. Bei allem anderen kannst du auch im <b>Chat</b> fragen.</p>
<p><b>Seite leer oder etwas fehlt?</b> Lade die Seite einmal neu. Hilft das nicht, melde dich ab und wieder an.</p>""", gruppe=G4)

# --------------------------------------------------------------- HTML
inhalt = ""
akt = None
for i, (gruppe, titel, text, bilder) in enumerate(FRAGEN, 1):
    if gruppe != akt:
        inhalt += f'<h2 class="gruppe">{html.escape(gruppe)}</h2>'
        akt = gruppe
    inhalt += (f'<section class="frage"><h3><span class="qnr">{i}</span>{html.escape(titel)}</h3>'
               f'<div class="text">{text}</div>' + "".join(bilder) + "</section>")

verz = ""
akt = None
for i, (gruppe, titel, _, _) in enumerate(FRAGEN, 1):
    if gruppe != akt:
        verz += f'<li class="vg">{html.escape(gruppe)}</li>'
        akt = gruppe
    verz += f'<li><span>{i}</span>{html.escape(titel)}</li>'

seite = f"""<!doctype html><html lang="de"><head><meta charset="utf-8">
<title>So findest du dich zurecht</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Work+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
@page {{ size: A4; margin: 14mm 15mm 14mm; }}
* {{ box-sizing: border-box; }}
body {{ font-family: "Work Sans", Helvetica, Arial, sans-serif; color: #23321e; font-size: 11pt; line-height: 1.5; margin: 0; }}
.titel {{ height: 265mm; display: flex; flex-direction: column; justify-content: space-between; break-after: page; }}
.titel img {{ height: 40px; align-self: flex-start; }}
.titel h1 {{ font-family: Anton, sans-serif; font-weight: 400; font-size: 46pt; line-height: 1.02; margin: 0 0 10px; }}
.titel .unter {{ font-size: 14pt; color: #5f6b5a; margin: 0 0 18px; }}
.band {{ width: 70px; height: 7px; border-radius: 4px; background: #a2e500; margin-bottom: 22px; }}
.verz {{ list-style: none; padding: 0; margin: 0; columns: 2; column-gap: 26px; font-size: 10pt; }}
.verz li {{ display: flex; gap: 8px; padding: 3px 0; break-inside: avoid; }}
.verz li span {{ color: #6e44d6; font-weight: 700; min-width: 16px; }}
.verz li.vg {{ font-weight: 700; text-transform: uppercase; letter-spacing: .07em; font-size: 8pt; color: #697364; padding-top: 10px; }}
.fuss {{ font-size: 8.5pt; color: #697364; }}
h2.gruppe {{ font-family: Anton, sans-serif; font-weight: 400; font-size: 22pt; margin: 0 0 6px; break-after: avoid; }}
h2.gruppe:not(:first-child) {{ break-before: page; }}
.frage {{ break-inside: avoid; margin: 0; padding: 16px 0 18px; border-top: 1px solid #eceee8; }}
h2.gruppe + .frage {{ border-top: 0; padding-top: 4px; }}
.frage h3 {{ display: flex; align-items: center; gap: 10px; font-size: 12.5pt; margin: 0 0 6px; }}
.qnr {{ flex: none; width: 26px; height: 26px; border-radius: 50%; background: #6e44d6; color: #fff; font-size: 10.5pt; display: flex; align-items: center; justify-content: center; }}
.text p {{ margin: 0 0 6px; }}
.text ul, .text ol {{ margin: 0 0 6px; padding-left: 20px; }}
.text li {{ margin: 0 0 3px; }}
.nr, .marke b {{ display: inline-flex; align-items: center; justify-content: center; width: 17px; height: 17px; border-radius: 50%; background: #a2e500; color: #23321e; font-weight: 700; font-size: 8.5pt; vertical-align: 1px; }}
.shot {{ position: relative; overflow: hidden; width: 100%; margin: 10px auto 0; border-radius: 10px; border: 1px solid #eceee8; background: #fff; }}
.shot img {{ position: absolute; max-width: none; }}
.marke {{ position: absolute; border: 2px solid #8ac300; border-radius: 10px; }}
.marke b {{ position: absolute; top: -9px; left: -9px; width: 20px; height: 20px; font-size: 9pt; box-shadow: 0 0 0 2px #fff; }}
.farben {{ display: flex; flex-wrap: wrap; gap: 6px 16px; margin-top: 6px; font-size: 9.5pt; }}
.farben span {{ display: inline-flex; align-items: center; gap: 6px; }}
.farben i {{ width: 12px; height: 12px; border-radius: 4px; display: inline-block; }}
.platzhalter {{ background: #fff1e8; padding: 0 4px; border-radius: 4px; }}
</style></head><body>
<section class="titel">
  <img src="jpg/logo.png" alt="The Academy for Climate Jobs">
  <div>
    <h1>So findest du dich zurecht</h1>
    <p class="unter">Fragen und Antworten zur Lernplattform</p>
    <div class="band"></div>
    <ul class="verz">{verz}</ul>
  </div>
  <p class="fuss">learn.climatejobsacademy.com · Stand {sys.argv[1] if len(sys.argv) > 1 else ""}</p>
</section>
{inhalt}
</body></html>"""
(BASIS / "kurzanleitung.html").write_text(seite)
print(len(FRAGEN), "Fragen")
