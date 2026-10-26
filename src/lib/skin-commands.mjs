// Lionarius/Suiranoil SkinRestorer, not the unrelated SkinsRestorer plugin.
// https://github.com/Suiranoil/SkinRestorer/wiki/Commands
export function skinCommand({ source, value, model = 'classic' }) {
  if (typeof value !== 'string')
    throw new Error('Въведи име на играч или връзка към PNG изображение.');
  const input = value.trim();
  if (['mojang', 'ely.by'].includes(source)) {
    if (!/^[A-Za-z0-9_]{3,16}$/.test(input))
      throw new Error(
        'Използвай име от 3 до 16 латински букви, цифри или долни черти.',
      );
    return `/skin set ${source} ${input}`;
  }
  if (source !== 'web' || !['classic', 'slim'].includes(model))
    throw new Error(
      'Избери поддържан източник на изображението и форма на героя.',
    );
  let url;
  try {
    url = new URL(input);
  } catch {}
  if (
    !url ||
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    /[\s"\\\u0000-\u001f\u007f]/.test(input)
  )
    throw new Error('Въведи публична защитена връзка към PNG изображение.');
  const command = `/skin set web ${model} "${url.href}"`;
  if (command.length > 256)
    throw new Error(
      'Връзката е твърде дълга за разговора в Minecraft. Използвай по-кратка пряка връзка към PNG изображението.',
    );
  return command;
}
