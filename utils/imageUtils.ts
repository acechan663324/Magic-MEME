/**
 * Converts a File object to a base64 data URL.
 * @param file The File object to convert.
 * @returns A promise that resolves with the full data URL string.
 */
export const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            resolve(reader.result as string);
        };
        reader.onerror = (error) => reject(error);
    });
};

/**
 * Crops an image from a data URL to a 1:1 aspect ratio (square).
 * The crop is taken from the center of the image.
 * @param dataUrl The data URL of the image to crop.
 * @returns A promise that resolves with the data URL of the cropped, square image.
 */
export const cropImageToSquare = (dataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            const size = Math.min(image.width, image.height);
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }

            const startX = (image.width - size) / 2;
            const startY = (image.height - size) / 2;

            ctx.drawImage(image, startX, startY, size, size, 0, 0, size, size);
            resolve(canvas.toDataURL('image/png'));
        };
        image.onerror = (error) => reject(error);
        image.src = dataUrl;
    });
};
