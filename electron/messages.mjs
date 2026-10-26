// Only presentation text is translated. File names, release names and game output
// keep their original values so diagnostics and user data remain accurate.
const messages = new Map(
  Object.entries({
    'Checking launcher updates': 'Проверка за нова версия на приложението',
    'Checking launcher updates…': 'Проверка за нова версия на приложението…',
    'Restoring your account': 'Зареждане на запомнения профил',
    'Restoring your account…': 'Зареждане на запомнения профил…',
    'Checking the latest modpack': 'Проверка на последната версия на пакета',
    'Checking and updating the latest modpack…':
      'Проверка и обновяване на пакета…',
    'Launcher updates could not be checked':
      'Новата версия на приложението не може да бъде проверена.',
    'Development build · installer updates skipped':
      'Пробна версия · автоматичното обновяване е изключено',
    'Launcher is up to date': 'Приложението е обновено до последната версия.',
    'Latest modpack ready': 'Последната версия на пакета е готова.',
    'Offline profile needs sign-in': 'Влез отново в местния профил.',
    'Microsoft session needs sign-in · reconnect from Home':
      'Влез отново в Microsoft от началната страница.',
    'Choose an account after startup':
      'Избери профил след отварянето на приложението.',
    'Verifying the latest CurseForge client release…':
      'Проверка на последната версия в CurseForge…',
    'Latest client release verified.': 'Последната версия е проверена.',
    'Preparing Fabric…': 'Подготовка на Fabric…',
    'Reusing downloaded Minecraft assets and libraries…':
      'Използване на вече изтеглените файлове на Minecraft…',
    'Modpack ready. Your adventure awaits.':
      'Пакетът е готов. Приключението те очаква.',
    'Checking Java and confirming the latest modpack…':
      'Проверка на Java и последната версия на пакета…',
    'Starting Minecraft…': 'Стартиране на Minecraft…',
    'Minecraft is running.': 'Minecraft работи.',
    'Stopping Minecraft…': 'Спиране на Minecraft…',
    'Minecraft closed. Ready to play.':
      'Minecraft е затворен. Можеш да играеш отново.',
    'Minecraft launch cancelled.': 'Стартирането на Minecraft е отменено.',
    'Preparing your Patilanci adventure.':
      'Подготовка на приключението в Патиланци.',
    'This Microsoft account needs Minecraft Java Edition.':
      'За този Microsoft профил е необходимо закупено копие на Minecraft Java Edition.',
    'Sign in with Microsoft first': 'Първо влез с Microsoft.',
    'Sign out before choosing a different account.':
      'Първо излез от текущия профил, за да избереш друг.',
    'Choose a Microsoft account or an offline profile.':
      'Избери Microsoft профил или местен профил.',
    'Confirm your offline profile PIN to sign in first.':
      'Първо потвърди ПИН кода на местния профил.',
    'Username must have 3–16 letters, numbers or underscores.':
      'Името трябва да съдържа от 3 до 16 латински букви, цифри или долни черти.',
    'Enter a PIN containing 6–12 digits.': 'Въведи ПИН код от 6 до 12 цифри.',
    'The PIN confirmation does not match.': 'Двата ПИН кода не съвпадат.',
    'The local profile limit was reached.':
      'Достигнат е максималният брой местни профили.',
    'Memory must be 2–32 GB': 'Избери между 2 и 32 ГБ памет за играта.',
    'Game window must be 640–7680 × 480–4320 with a fullscreen preference':
      'Широчината трябва да е между 640 и 7680, а височината — между 480 и 4320. Избери и дали да се използва цял екран.',
    'Install the Patilanci modpack before adding mods.':
      'Първо инсталирай пакета на Патиланци, за да добавяш свои добавки.',
    'Install the Patilanci modpack before changing mods.':
      'Първо инсталирай пакета на Патиланци, за да променяш добавките.',
    'Patilanci modpack files are protected. Only mods added through this launcher can be removed.':
      'Добавките от основния пакет са защитени. Можеш да премахваш само добавените от теб.',
    'Patilanci modpack files are protected. Only mods added through this launcher can be enabled or disabled.':
      'Добавките от основния пакет са защитени. Можеш да включваш и изключваш само добавените от теб.',
    'Close Minecraft or wait for the current operation.':
      'Затвори Minecraft или изчакай текущото действие да приключи.',
    'Minecraft or an installation is already running':
      'Minecraft вече работи или в момента се извършва инсталация.',
    'Minecraft could not be stopped. Close its game window and try again.':
      'Minecraft не може да бъде спрян. Затвори прозореца на играта и опитай отново.',
    'Minecraft exited before it could start.':
      'Minecraft се затвори преди стартирането да приключи.',
    'Download the launcher update before installing it.':
      'Първо изтегли новата версия на приложението.',
    'Update download did not complete.':
      'Изтеглянето на новата версия не завърши. Опитай отново.',
    'No update response.':
      'Няма отговор при проверката за обновяване. Опитай отново.',
    'Download integrity check failed':
      'Изтегленият файл не премина проверката. Изтегли го отново.',
    'HTTPS required': 'Необходима е защитена интернет връзка.',
    'Only Fabric packs are currently supported':
      'В момента се поддържат само пакети за Fabric.',
    'Unsupported Java version.': 'Тази версия на Java не се поддържа.',
    'Could not read the Java version. Choose bin/java.exe from a Java installation.':
      'Версията на Java не може да бъде разпозната. Избери файла bin/java.exe от папката на Java.',
    'Cannot run the selected Java executable. Check its path in Settings.':
      'Избраният файл за Java не може да бъде стартиран. Провери избора си в настройките.',
    'Missing or oversized Fabric metadata.':
      'Файлът не съдържа необходимата информация за добавка за Fabric или тя е твърде голяма.',
    'Invalid Fabric metadata.':
      'Файлът не може да бъде разпознат като добавка за Fabric.',
    'Choose a Classic or Slim skin model.':
      'Избери стандартни или тънки ръце за героя.',
    'Choose a 64 × 64 or 64 × 32 Minecraft skin PNG.':
      'Избери PNG изображение с размер 64 × 64 или 64 × 32 точки.',
    'Legacy 64 × 32 skins require the Classic model.':
      'Изображенията с размер 64 × 32 се използват със стандартни ръце.',
    'Choose a skin PNG smaller than 1 MB.':
      'Избери PNG изображение, по-малко от 1 МБ.',
    'Sign in with Microsoft to upload an account skin.':
      'Влез с Microsoft, за да промениш външния вид на профила.',
    'Choose a skin PNG for this account first.':
      'Първо избери PNG изображение за този профил.',
    'Your account changed. Choose the skin PNG again.':
      'Профилът е променен. Избери изображението отново.',
    'Sign in to an offline profile to save its skin.':
      'Влез в местен профил, за да запазиш външния му вид.',
    'Sign in to this offline profile to view its skin.':
      'Влез в местния профил, за да видиш героя.',
    'Sign in with Microsoft to view your skin.':
      'Влез с Microsoft, за да видиш героя си.',
    'The update service is temporarily unavailable. Checking again automatically.':
      'Връзката за обновявания временно не е достъпна. Ще проверим отново автоматично.',
  }),
);

export function localizeMessage(
  value,
  fallback = 'Действието не можа да завърши. Опитай отново. Ако проблемът продължи, свържи се с екипа на Патиланци.',
) {
  const text = String(value?.message || value || '')
    .replace(/^Error invoking remote method '[^']+': (?:Error: )?/, '')
    .trim();
  if (!text) return '';
  if (messages.has(text)) return messages.get(text);
  const patterns = [
    [
      /^Launcher (.+) is ready to install$/,
      (v) => `Версия ${v} на приложението е готова за инсталиране.`,
    ],
    [
      /^(?:Offline profile|Microsoft account) restored · (.+)$/,
      (name) => `Запомненият профил е зареден · ${name}`,
    ],
    [
      /^Checking your Java (\d+) executable…$/,
      (v) => `Проверка на избрания файл за Java ${v}…`,
    ],
    [
      /^Using managed Java (\d+)\.$/,
      (v) => `Използва се автоматично изтеглената Java ${v}.`,
    ],
    [/^Finding Java (\d+)…$/, (v) => `Търсене на подходяща Java ${v}…`],
    [/^Downloading Java (\d+)…$/, (v) => `Изтегляне на Java ${v}…`],
    [/^Installing Java (\d+)…$/, (v) => `Инсталиране на Java ${v}…`],
    [/^Java (\d+) is ready\.$/, (v) => `Java ${v} е готова.`],
    [
      /^Selected Java (\d+)\. Choose a Java (\d+) executable for this row\.$/,
      (found, required) =>
        `Избрана е Java ${found}. За този ред избери файл от Java ${required}.`,
    ],
    [
      /^Java (\d+) is required, but the selected executable is Java (\d+)\. Choose Java \d+ in Settings or reset its path to Automatic\.$/,
      (required, found) =>
        `Необходима е Java ${required}, а е избрана Java ${found}. Избери файл за Java ${required} в настройките или върни автоматичния избор.`,
    ],
    [
      /^Incorrect local profile PIN\. (\d+) attempts remaining\.$/,
      (n) => `Неправилен ПИН код. Оставащи опити: ${n}.`,
    ],
    [
      /^This profile is locked\. Try again in (\d+) (?:minute|minutes)\.$/,
      (n) => `Профилът е заключен. Опитай отново след ${n} минути.`,
    ],
    [
      /^Downloading (\d+)\/(\d+) mods…$/,
      (n, total) => `Изтегляне на добавки: ${n} от ${total}…`,
    ],
    [
      /^Downloading mod (\d+) of (\d+)$/,
      (n, total) => `Изтегляне на добавки: ${n} от ${total}…`,
    ],
    [
      /^Downloading (.+?) \((\d+)\/(\d+)\)…$/,
      (name, n, total) => `Изтегляне на ${name} (${n} от ${total})…`,
    ],
    [
      /^Now included in the protected pack: (.+)$/,
      (files) => `Вече са включени в защитения пакет: ${files}`,
    ],
    [/^Preparing .+…$/i, () => 'Подготовка на файловете на Minecraft…'],
    [
      /^Minecraft exited with code (.+)\.$/,
      (code) =>
        `Minecraft се затвори. Код: ${code === 'unknown' ? 'неизвестен' : code}.`,
    ],
    [
      /^Launcher preparation completed in ([\d.]+) seconds\.$/,
      (n) => `Подготовката завърши за ${n} секунди.`,
    ],
    [
      /^(.+\.jar): choose a JAR under 128 MB\.$/,
      (name) => `${name}: избери файл, по-малък от 128 МБ.`,
    ],
    [
      /^(.+\.jar) conflicts with Minecraft or Fabric Loader\.$/,
      (name) => `${name} не е съвместим с Minecraft или Fabric.`,
    ],
    [
      /^Mod exceeds the 128 MB limit: (.+)$/,
      (name) => `Добавката е по-голяма от 128 МБ: ${name}`,
    ],
    [
      /^Download failed \((\d+)\)$/,
      (code) => `Изтеглянето не успя. Отговор от сървъра: ${code}.`,
    ],
    [
      /^Request failed \((\d+)\) at (.+)$/,
      (code, host) => `Няма успешен отговор от ${host}. Код: ${code}.`,
    ],
  ];
  for (const [pattern, format] of patterns) {
    const match = text.match(pattern);
    if (match) return format(...match.slice(1));
  }
  if (
    /[А-Яа-я]/.test(text) &&
    !/\b(?:Error|failed|could|requires|must|Choose|Invalid|Missing|cannot|conflicts|expected|received|not found)\b/i.test(
      text,
    )
  )
    return text;
  if (/PIN|profile.*lock/i.test(text))
    return 'Не можем да потвърдим ПИН кода. Провери го и опитай отново. След поредица от грешни опити изчакай пет минути.';
  if (/sign.in|account|authentication|token|session/i.test(text))
    return 'Входът не можа да бъде потвърден. Провери интернет връзката си и влез в профила отново.';
  if (/conflict|duplicate|already.*mod|ownership/i.test(text))
    return 'Добавката се повтаря или не е съвместима с пакета. Провери добавените файлове, преди да опиташ отново.';
  if (/java|runtime/i.test(text))
    return 'Java не може да бъде подготвена. Провери интернет връзката или върни автоматичния избор на Java в настройките.';
  if (/skin|png|texture|image/i.test(text))
    return 'Изображението не може да бъде използвано. Избери достъпно PNG изображение с размер 64 × 64 или 64 × 32 точки, до 1 МБ.';
  if (
    /network|fetch|internet|connection|download|curseforge|service|timeout|https|ENOTFOUND|ECONN/i.test(
      text,
    )
  )
    return 'Няма връзка за изтегляне. Провери интернет връзката си и опитай отново.';
  if (
    /EACCES|EPERM|permission|access denied|disk|ENOSPC|file|directory|archive/i.test(
      text,
    )
  )
    return 'Файловете не могат да бъдат прочетени или записани. Провери свободното място и дали имаш достъп до папката на играта.';
  if (/close Minecraft|wait for|already running|current operation/i.test(text))
    return 'Затвори Minecraft и изчакай текущото действие да приключи, след което опитай отново.';
  return fallback;
}
