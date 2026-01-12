import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Store, User, Mail, Phone, Lock, Upload, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { authService } from '../../services/authService';
import { vendorAPI } from '../../services/api';

const VendorRegister = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    business_name: '', email: '', phone_number: '', password: '', role: 'vendor', storefront_image_url: ''
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let imageUrl = '';
      if (imageFile) {
        const uploadRes = await vendorAPI.uploadImage(imageFile);
        imageUrl = uploadRes.url;
      }
      await authService.register({ ...formData, storefront_image_url: imageUrl });
      navigate('/vendor/checkin');
    } catch (error) {
      alert(error.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-orange-50/50 flex items-center justify-center py-12 px-4 relative">
      
      {/* --- BACK BUTTON (Escape) --- */}
      <button 
        onClick={() => navigate('/')} 
        className="absolute top-6 left-6 flex items-center gap-2 text-gray-600 hover:text-orange-600 font-bold transition-colors bg-white px-4 py-2 rounded-full shadow-sm"
      >
        <ArrowLeft className="h-5 w-5" /> Back to Home
      </button>

      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-orange-100 overflow-hidden mt-10">
        <div className="bg-gray-900 p-6 text-white text-center relative">
          <button 
            onClick={() => navigate('/vendor/login')}
            className="absolute left-4 top-4 text-gray-400 hover:text-white"
            title="Back to Login"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Store className="h-10 w-10 mx-auto mb-3 text-orange-500" />
          <h2 className="text-2xl font-bold">Join HyperLocal</h2>
          <p className="text-gray-400 text-sm">Create your vendor profile</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {/* Form Fields */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
            <div className="relative">
              <Store className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              <input required type="text" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500" placeholder="Mama's Kitchen"
                onChange={e => setFormData({ ...formData, business_name: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <input required type="email" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500" placeholder="Email"
                  onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <input required type="tel" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500" placeholder="07..."
                  onChange={e => setFormData({ ...formData, phone_number: e.target.value })} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              <input required type="password" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500" placeholder="Create password"
                onChange={e => setFormData({ ...formData, password: e.target.value })} />
            </div>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:bg-orange-50 transition-colors relative">
             <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
             {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="h-32 w-full object-cover rounded-lg" />
             ) : (
                <div className="text-gray-500">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <span className="text-sm">Upload Storefront Image</span>
                </div>
             )}
          </div>

          <button disabled={loading} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all">
             {loading ? <Loader2 className="animate-spin" /> : <>Complete Registration <ArrowRight /></>}
          </button>
          
          <p className="text-center text-sm text-gray-600">Already registered? <Link to="/vendor/login" className="text-orange-600 font-bold">Login here</Link></p>
        </form>
      </div>
    </div>
  );
};
export default VendorRegister;