import Header from "../components/Header/Header";
import { Outlet, useLocation } from "react-router-dom";
import Footer from "../components/Footer/Footer";
import FaqChatWidget from "../components/FaqChatWidget/FaqChatWidget";
import PageBackground from "../components/PageBackground/PageBackground";

export default function Layout() {
    const location = useLocation();
    const isMessengerPage = location.pathname.startsWith("/messenger");
    return (
        <PageBackground className="flex flex-col items-center">
            <Header />
            <Outlet />
            {!isMessengerPage && <Footer />}
            {!isMessengerPage && <FaqChatWidget />}
        </PageBackground>
    );
}
