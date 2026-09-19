import { useEffect, useRef, useState } from 'react';

const useInViewport = <T extends Element>(rootMargin = '200px'): [React.RefObject<T | null>, boolean] => {
    const ref = useRef<T>(null);
    const [isInViewport, setIsInViewport] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => setIsInViewport(entries.some((entry) => entry.isIntersecting)),
            { rootMargin },
        );

        observer.observe(element);

        return () => observer.disconnect();
    }, [rootMargin]);

    return [ref, isInViewport];
};

export { useInViewport };
