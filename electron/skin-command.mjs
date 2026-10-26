// Lionarius/Suiranoil SkinRestorer, not the unrelated SkinsRestorer plugin.
// https://github.com/Suiranoil/SkinRestorer/wiki/Commands
export function skinCommand({ source, value, model = 'classic' }) {
  if (typeof value !== 'string')
    throw new Error('Enter a skin name or PNG URL.');
  const input = value.trim();
  if (['mojang', 'ely.by'].includes(source)) {
    if (!/^[A-Za-z0-9_]{3,16}$/.test(input))
      throw new Error('Use a name with 3–16 letters, numbers or underscores.');
    return `/skin set ${source} ${input}`;
  }
  if (source !== 'web' || !['classic', 'slim'].includes(model))
    throw new Error('Choose a supported skin source and model.');
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
    throw new Error('Enter a public HTTPS URL to a skin PNG.');
  const command = `/skin set web ${model} "${url.href}"`;
  if (command.length > 256)
    throw new Error(
      'This URL is too long for Minecraft chat. Use a shorter direct PNG URL.',
    );
  return command;
}
