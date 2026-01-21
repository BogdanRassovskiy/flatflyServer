import { Routes, Route } from "react-router-dom";
import Layout from "./layout/layout";
import HomePage from "./pages/HomePage/HomePage";
import BlogPage from "./pages/BlogPage/BlogPage";
import ArticlePage from "./pages/ArticlePage/ArticlePage";
import ContactPage from "./pages/ContactPage/ContactPage";
import AddingPage from "./pages/AddingPage/AddingPage";
import NeighboursPage from "./pages/NeighboursPage/NeighboursPage";
import ApartmentsPage from "./pages/ApartmentsPage/ApartmentsPage";
import ListingDetailPage from "./pages/ListingDetailPage/ListingDetailPage";
import ScrollToTop from "./components/ScrollToTop/ScrollToTop";
import ProfilePage from "./pages/ProfilePage/ProfilePage";
import AuthPage from "./pages/AuthPage/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage/ResetPasswordPage";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
// import другие страницы при необходимости

function App() {
    return (
        <>
            <ScrollToTop />
            <Routes>
                <Route element={<Layout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/blog">
                        <Route index element={<BlogPage />} />
                        <Route path=":id" element={<ArticlePage />} />
                    </Route>
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/reset-password/:uid/:token" element={<ResetPasswordPage />} />
                    
                    {/* Защищенные маршруты - требуют авторизации */}
                    <Route 
                        path="/add" 
                        element={
                            <ProtectedRoute>
                                <AddingPage />
                            </ProtectedRoute>
                        } 
                    />

                    <Route 
                        path="/profile" 
                        element={
                            <ProtectedRoute>
                                <ProfilePage/>
                            </ProtectedRoute>
                        } 
                    />
                    
                    <Route path="/rooms">
                        <Route
                          index
                          element={<ApartmentsPage listingType="APARTMENT" />}
                        />
                        <Route path=":id" element={<ListingDetailPage />} />
                    </Route>
                    <Route path="/neighbours">
                        <Route index element={<NeighboursPage />} />
                        <Route path=":id" element={<ListingDetailPage />} />
                    </Route>
                    <Route path="/apartments">
                        <Route
                          index
                          element={<ApartmentsPage listingType="APARTMENT" />}
                        />
                        <Route path=":id" element={<ListingDetailPage />} />
                    </Route>
                    

                </Route>
            </Routes>
        </>
    );
}

export default App;
