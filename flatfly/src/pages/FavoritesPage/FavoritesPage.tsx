import { useState, useEffect } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import SaleCard from "../../components/SaleCard/SaleCard";
import { Heart } from "lucide-react";
import type { SaleCardTypes } from "../../components/SaleCard/SaleCard";
import { getCsrfToken } from "../../utils/csrf";
import { getImageUrl } from "../../utils/defaultImage";

interface Listing {
  id: number;
  title: string;
  description: string;
  price: string | number;
  room_type: "APARTMENT" | "ROOM";
  city: string;
  region: string;
  area: string | number;
  image_url: string | null;
  amenities: string[];
  is_favorite?: boolean;
}

export default function FavoritesPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFavorites();
  }, [pagination]);

  const fetchFavorites = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await fetch(
        `/api/favorites/?page=${pagination}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch favorites");
      }

      const data = await response.json();
      setListings(data.listings);
      setTotalPages(data.total_pages);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading favorites");
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const convertToSaleCardType = (listing: Listing): SaleCardTypes => {
    const type = listing.room_type === "APARTMENT" ? "APARTMENT" : listing.room_type === "ROOM" ? "ROOM" : "APARTMENT";
    
    return {
      id: listing.id,
      type: type as "APARTMENT" | "ROOM" | "NEIGHBOUR",
      price: listing.price,
      image: getImageUrl(listing.image_url),
      title: listing.title,
      region: listing.region,
      address: listing.city,
      size: listing.area?.toString() || "N/A",
      amenities: listing.amenities,
      is_favorite: listing.is_favorite ?? true,
    };
  };

  const handleRemoveFavorite = async (listingId: number) => {
    try {
      const response = await fetch("/api/favorites/remove/", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
        },
        credentials: "include",
        body: JSON.stringify({ listing_id: listingId }),
      });

      if (response.ok) {
        setListings(listings.filter(l => l.id !== listingId));
      }
    } catch (err) {
      console.error("Error removing favorite:", err);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p>{t("please_login")}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8 md:py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Heart className="w-8 h-8 text-red-500 fill-red-500" />
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              {t("favorites")}
            </h1>
          </div>
          <p className="text-gray-600 max-w-2xl">
            {listings.length === 0 && !loading
              ? t("no_favorites_yet")
              : `${listings.length} ${t("listings")}`}
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-20">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Empty State */}
        {!loading && listings.length === 0 && !error && (
          <div className="text-center py-20">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-4">{t("no_favorites_yet")}</p>
            <a
              href="/apartments"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              {t("explore_listings")}
            </a>
          </div>
        )}

        {/* Listings Grid */}
        {!loading && listings.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {listings.map((listing) => (
                <div
                  key={listing.id}
                  className="relative group"
                >
                  <SaleCard
                    {...convertToSaleCardType(listing)}
                    onRemoveFavorite={() => handleRemoveFavorite(listing.id)}
                  />
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  disabled={pagination === 1}
                  onClick={() => setPagination(Math.max(1, pagination - 1))}
                  className="px-4 py-2 bg-white border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  {t("previous")}
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setPagination(page)}
                      className={`px-3 py-2 rounded-lg ${
                        pagination === page
                          ? "bg-blue-600 text-white"
                          : "bg-white border hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  disabled={pagination === totalPages}
                  onClick={() => setPagination(Math.min(totalPages, pagination + 1))}
                  className="px-4 py-2 bg-white border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  {t("next")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
