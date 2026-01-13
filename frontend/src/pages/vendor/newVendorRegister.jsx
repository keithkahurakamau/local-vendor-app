import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
// ADDED: ArrowLeft
import { User, Mail, Lock, Phone, MapPin, Store, Upload, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { authService } from '../../services/authService';
import { vendorAPI } from '../../services/api';

// --- SAFE IMAGE COMPONENT ---
const SafeHeroImage = ({ src, alt }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div className="absolute inset-0 bg-gray-900 w-full h-full flex flex-col items-center justify-center text-gray-600 opacity-60">
        <Store className="h-16 w-16 mb-2 opacity-20" />
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      className="absolute inset-0 w-full h-full object-cover opacity-60" 
      onError={() => setHasError(true)} 
    />
  );
};

const NewVendorRegister = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    phone_number: '',
    business_name: '',
    storefront_image: null 
  });

  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size too large (Max 5MB)");
        return;
      }
      setFormData({ ...formData, storefront_image: file });
      setImagePreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let finalImageUrl = "";

      // 1. Upload Image First
      if (formData.storefront_image) {
        try {
          const uploadRes = await vendorAPI.uploadImage(formData.storefront_image);
          finalImageUrl = uploadRes.url;
        } catch (uploadError) {
          console.error("Image upload failed", uploadError);
          throw new Error("Failed to upload storefront image. Please try again.");
        }
      }

      // 2. Register
      const registerPayload = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: 'vendor',
        phone_number: formData.phone_number,
        business_name: formData.business_name,
        storefront_image_url: finalImageUrl
      };

      await authService.register(registerPayload);
      navigate('/vendor/dashboard');

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50/50 py-12 px-4 sm:px-6 lg:px-8 relative">
      
      {/* ADDED: Escape / Back to Home Button */}
      <div className="absolute top-6 left-6 z-20">
        <Link 
          to="/" 
          className="flex items-center gap-2 text-gray-500 hover:text-orange-600 transition-colors font-medium bg-white px-4 py-2 rounded-full shadow-sm hover:shadow-md border border-gray-100"
        >
           <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>
      </div>

      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 bg-white rounded-3xl shadow-xl overflow-hidden relative z-10">
        
        {/* Left Side (Hero) */}
        <div className="hidden md:block relative bg-gray-900">
          <SafeHeroImage src="/images/hero2.jpg" alt="Vendor Registration" />
          
          <div className="relative z-10 p-12 h-full flex flex-col justify-between text-white">
            <div>
              <h2 className="text-4xl font-bold mb-4">Partner with us</h2>
              <p className="text-lg text-gray-200">Join thousands of local vendors growing their business with HyperLocal.</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500 rounded-lg"><Store className="h-6 w-6" /></div>
                <div><p className="font-bold">Reach More Customers</p><p className="text-sm text-gray-300">Expand your delivery radius instantly</p></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side (Form) */}
        <div className="p-8 sm:p-12">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Create Vendor Account</h2>
            <p className="mt-2 text-gray-600">Start selling in your neighborhood today</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 flex items-center gap-3 rounded-r-lg">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-5">
              <div className="relative">
                <User className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <input name="username" type="text" required placeholder="Full Name" className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" value={formData.username} onChange={handleChange} />
              </div>
              <div className="relative">
                <Store className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <input name="business_name" type="text" required placeholder="Business Name" className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" value={formData.business_name} onChange={handleChange} />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <input name="email" type="email" required placeholder="Email Address" className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" value={formData.email} onChange={handleChange} />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <input name="phone_number" type="tel" required placeholder="M-Pesa Phone Number" className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" value={formData.phone_number} onChange={handleChange} />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <input name="password" type="password" required placeholder="Create Password" className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" value={formData.password} onChange={handleChange} />
              </div>
              
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="h-32 w-full object-cover rounded-lg" />
                ) : (
                  <div className="py-4">
                    <div className="bg-orange-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 text-orange-600"><Upload className="h-6 w-6" /></div>
                    <p className="text-sm font-medium text-gray-900">Upload Storefront Image</p>
                  </div>
                )}
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition-all flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="animate-spin h-5 w-5" /> Creating Account...</> : 'Register Business'}
            </button>
          </form>
          
          <p className="mt-8 text-center text-gray-600">
            Already have an account? <Link to="/vendor/login" className="text-orange-600 font-bold hover:underline">Log in here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default NewVendorRegister;