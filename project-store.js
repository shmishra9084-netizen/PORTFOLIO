export function safeMedia(value) {
  if (typeof value !== 'string') return false;
  return /^assets\/[A-Za-z0-9_./-]+\.(?:jpe?g|png|webp|avif|mp4|webm)$/i.test(value) && !value.includes('..') || /^https:\/\/[^\s]+$/i.test(value);
}
export function validateDocument(data) {
  if (data?.version !== 1 || !Array.isArray(data.projects) || data.projects.length > 100) throw Error('Invalid project collection.');
  const ids = new Set();
  for (const p of data.projects) {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(p.id) || ids.has(p.id)) throw Error('Project IDs must be unique.');
    ids.add(p.id);
    if (!p.title?.trim() || p.title.length > 140 || typeof p.description !== 'string' || p.description.length > 2000 || typeof p.category !== 'string' || p.category.length > 80) throw Error('Check project title, category and description.');
    if (!['large','small','half'].includes(p.layout) || !Array.isArray(p.images) || !p.images.length || p.images.length > 12) throw Error('Each project needs 1–12 images and a valid layout.');
    for (const image of p.images) if (!safeMedia(image.src) || typeof image.alt !== 'string') throw Error('Invalid image path.');
    if (p.video && !safeMedia(p.video)) throw Error('Use an HTTPS video URL or a local assets path.');
  }
  return data;
}
