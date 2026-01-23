import logoImage from "../assets/logo.png";

export const DEFAULT_IMAGE_URL = logoImage;

export const getDefaultImage = (): string => {
  // Используем логотип FlatFly для всех типов изображений по умолчанию
  return DEFAULT_IMAGE_URL;
};

/**
 * Возвращает изображение, либо дефолтное если оно не передано
 */
export const getImageUrl = (
  imageUrl: string | null | undefined
): string => {
  return imageUrl || getDefaultImage();
};
