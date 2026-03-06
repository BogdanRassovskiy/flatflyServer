import Header from "../components/Header/Header";
import { Outlet } from "react-router-dom";
import Footer from "../components/Footer/Footer";
import FaqChatWidget from "../components/FaqChatWidget/FaqChatWidget";
import PageBackground from "../components/PageBackground/PageBackground";

export default function Layout() {
    return (
        <PageBackground className="flex flex-col items-center">
            <Header />
            <Outlet />
            <Footer/>
            <FaqChatWidget />
        </PageBackground>
    );
}
