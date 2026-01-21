import Header from "../components/Header/Header";
import { Outlet } from "react-router-dom";
import Footer from "../components/Footer/Footer";

export default function Layout() {
    return (
        <div className="w-full min-h-screen flex flex-col items-center">
            <Header />
            <Outlet />
            <Footer/>
        </div>
    );
}
