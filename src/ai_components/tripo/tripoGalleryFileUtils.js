export function dataUrlToFile(dataUrl, name = "gallery-image.png") {
  const [header = "", base64 = ""] = String(dataUrl || "").split(",");
  const mime = header.match(/data:([^;]+)/)?.[1] || "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], name, { type: mime });
}

export function galleryItemsToFiles(images = [], getName = (_, index) => `gallery-image-${index + 1}.png`) {
  return images
    .filter((img) => img?.dataUrl)
    .map((img, index) => ({
      file: dataUrlToFile(img.dataUrl, getName(img, index)),
      preview: img.dataUrl,
      source: img,
    }));
}
