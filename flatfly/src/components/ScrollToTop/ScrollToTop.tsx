

import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
    
    const { pathname, hash } = useLocation();

    useEffect(() => {
        if (hash) {
            // Wait one frame for route content render, then jump to anchor.
            requestAnimationFrame(() => {
                const id = hash.replace("#", "");
                const el = document.getElementById(id);
                if (el) {
                    const y = el.getBoundingClientRect().top + window.scrollY - 120;
                    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
                }
            });
            return;
        }
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'smooth'
        });
    }, [pathname, hash]);

    return null;
}

