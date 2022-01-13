export default function postpone(callback, delay) {
    return new Promise((resolve, reject) => {
        setTimeout(async () => {
            try {
                resolve(await callback());
            } catch (error) {
                reject(error);
            }
        }, delay);
    });
}
