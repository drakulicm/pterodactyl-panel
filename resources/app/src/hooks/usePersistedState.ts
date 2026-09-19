import { useEffect, useRef, useState } from 'react';

const readValue = <T>(key: string, fallback: T): T => {
    try {
        const item = localStorage.getItem(key);

        return item === null ? fallback : (JSON.parse(item) as T);
    } catch {
        return fallback;
    }
};

const usePersistedState = <T>(key: string, fallback: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [state, setState] = useState<T>(() => readValue(key, fallback));
    const hasChanged = useRef(false);

    useEffect(() => {
        if (!hasChanged.current) {
            hasChanged.current = true;

            return;
        }

        localStorage.setItem(key, JSON.stringify(state));
    }, [key, state]);

    return [state, setState];
};

export { usePersistedState };
