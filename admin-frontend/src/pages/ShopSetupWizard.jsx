import React, { useState } from "react";
import { createShop } from "../api";
import { Store, MapPin, Loader2, CheckCircle2, ArrowRight } from "lucide-react";

export const ShopSetupWizard = ({ onSetupComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Shop fields
  const [shopName, setShopName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const shopData = {
        name: shopName,
        ownerName,
        phone,
        address,
        city,
        state,
        pincode,
        logoUrl
      };
      const newShop = await createShop(shopData);
      
      // Update local storage to reflect shop is set up
      const userData = JSON.parse(localStorage.getItem("admin_user_data") || "{}");
      userData.shopSetupComplete = true;
      userData.shopId = newShop.id;
      userData.shopName = newShop.name;
      userData.shopSlug = newShop.slug;
      userData.apiKey = newShop.apiKey;
      localStorage.setItem("admin_user_data", JSON.stringify(userData));
      
      setStep(3); // Success step
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to create shop.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-white rounded-2xl border border-[#E2E2E2] shadow-xs p-8 sm:p-10">
        
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                <Store className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-bold">Welcome to PrintAlfa!</h1>
              <p className="text-[#6B6B6B]">Let's set up your print shop profile.</p>
            </div>
            
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Shop Name</label>
                <input required value={shopName} onChange={(e) => setShopName(e.target.value)} type="text" placeholder="e.g. Quick Print Hub" className="input-field" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Owner Name</label>
                <input required value={ownerName} onChange={(e) => setOwnerName(e.target.value)} type="text" placeholder="John Doe" className="input-field" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Business Phone Number</label>
                <input required value={phone} onChange={(e) => setPhone(e.target.value)} type="text" placeholder="1234567890" className="input-field" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Logo URL (Optional)</label>
                <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} type="text" placeholder="https://..." className="input-field" />
              </div>
            </div>
            
            <button onClick={() => { if(shopName && ownerName && phone) setStep(2); }} className="w-full h-12 bg-black text-white rounded-lg font-bold flex items-center justify-center gap-2">
              Next Step <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                <MapPin className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-bold">Shop Location</h1>
              <p className="text-[#6B6B6B]">Where are you located?</p>
            </div>
            
            {error && (
              <div className="p-4 bg-rose-50 text-rose-800 rounded-lg border border-rose-200 text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Full Address</label>
                <input required value={address} onChange={(e) => setAddress(e.target.value)} type="text" placeholder="123 Main St, Shop #4" className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">City</label>
                  <input required value={city} onChange={(e) => setCity(e.target.value)} type="text" className="input-field" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">State</label>
                  <input required value={state} onChange={(e) => setState(e.target.value)} type="text" className="input-field" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Pincode</label>
                <input required value={pincode} onChange={(e) => setPincode(e.target.value)} type="text" className="input-field" />
              </div>
            </div>
            
            <div className="flex gap-4">
              <button type="button" onClick={() => setStep(1)} className="w-1/3 h-12 bg-gray-100 text-black rounded-lg font-bold hover:bg-gray-200">
                Back
              </button>
              <button type="submit" disabled={loading} className="w-2/3 h-12 bg-black text-white rounded-lg font-bold flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Complete Setup'}
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <div className="text-center space-y-6 py-8">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">You're all set!</h1>
              <p className="text-[#6B6B6B]">Your shop has been created and your device is securely registered.</p>
            </div>
            <button onClick={onSetupComplete} className="w-full h-12 bg-black text-white rounded-lg font-bold mt-4">
              Go to Dashboard
            </button>
          </div>
        )}
        
      </div>
    </div>
  );
};
