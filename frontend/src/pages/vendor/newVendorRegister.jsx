import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User, Mail, Lock, Phone, Store, Upload, Loader2, AlertCircle, ArrowLeft,
  Eye, EyeOff, Check, Radio, Wallet, MapPinned, X, ImageIcon,
} from 'lucide-react';
import { authService } from '../../services/authService';
import { vendorAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import GoogleLoginButton from '../../components/common/GoogleLoginButton';

/**
 * Vendor sign-up.
 *
 * Two things shape the layout. The form is long - six fields plus an image - so
 * it gets its own scroll column instead of pushing the submit button off a
 * desktop viewport, which is what the old single centred card did. And the pitch
 * panel sells the freshness timer, because "you are on the map for three hours
 * from check-in" is the one thing a vendor needs to understand before signing up.
 */

const SELLING_POINTS = [
  { icon: Radio, title: 'Go live in seconds', body: 'Check in and you are on the map for three hours.' },
  { icon: MapPinned, title: 'Customers nearby', body: 'Anyone within 5 km sees your stall and today’s menu.' },
  { icon: Wallet, title: 'Paid on M-Pesa', body: 'Orders are paid before collection. No chasing cash.' },
];

/** Defined at module scope: a component declared inside the page would be a new
 *  type on every render, remounting the input and losing focus per keystroke. */
function Field({ icon, label, hint, children, ...props }) {
  const IconTag = icon;
  return (
    <label className="block">
      <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-text-lighter">
        {label}
      </span>
      <span className="relative mt-1.5 block">
        <IconTag size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-lighter" />
        <input {...props} className="field w-full py-3 pl-10 pr-11 text-[14px] font-medium" />
        {children}
      </span>
      {hint && <span className="mt-1 block text-[11px] text-text-lighter">{hint}</span>}
    </label>
  );
}

const HeroArt = () => {
  const [failed, setFailed] = useState(false);

  return (
    <div className="absolute inset-0 overflow-hidden bg-text">
      {!failed && (
        <picture>
          <source srcSet="/images/hero-lg.webp" type="image/webp" />
          <img
            src="/images/hero-lg.jpg"
            alt=""
            className="h-full w-full object-cover"
            onError={() => setFailed(true)}
          />
        </picture>
      )}
      {/* Warm scrim rather than a flat opacity knock-back, so the photo keeps its
          contrast and the text still clears WCAG on top of it. */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#2D1509]/95 via-[#2D1509]/72 to-[#E55A2A]/45" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#2D1509]/85 via-transparent to-transparent" />
    </div>
  );
};

const NewVendorRegister = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    phone_number: '',
    business_name: '',
    storefront_image: null,
  });

  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false, number: false, special: false, upper: false,
  });
  const [passwordScore, setPasswordScore] = useState(0);

  useEffect(() => {
    const pwd = formData.password;
    const criteria = {
      length: pwd.length >= 8,
      number: /\d/.test(pwd),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
      upper: /[A-Z]/.test(pwd),
    };
    setPasswordCriteria(criteria);
    setPasswordScore(Object.values(criteria).filter(Boolean).length);
  }, [formData.password]);

  // Revoke the object URL when it is replaced or the page unmounts; without this
  // every re-pick leaks a blob for the life of the tab.
  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview); }, [imagePreview]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('That image is over 5MB — try a smaller one.');
      return;
    }
    setFormData({ ...formData, storefront_image: file });
    setImagePreview(URL.createObjectURL(file));
    setError('');
  };

  const clearImage = () => {
    setFormData({ ...formData, storefront_image: null });
    setImagePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (passwordScore < 3) {
      setError('Please create a stronger password before continuing.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Register first. /vendor/upload requires a vendor token, so the image
      //    cannot be uploaded before the account exists.
      const response = await authService.register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: 'vendor',
        phone_number: formData.phone_number,
        business_name: formData.business_name,
      });

      if (response.token && response.user) {
        // 2. Log in immediately so the api interceptor can attach the token.
        login(response.token, response.user);

        // 3. Now the upload is authenticated. A failure here must not undo a
        //    successful signup - the vendor can set the image later from Settings.
        if (formData.storefront_image) {
          try {
            const uploadRes = await vendorAPI.uploadImage(formData.storefront_image);
            if (uploadRes.url) {
              await vendorAPI.updateProfile({ storefront_image_url: uploadRes.url });
            }
          } catch (uploadError) {
            console.error('Storefront image upload failed; account was still created', uploadError);
          }
        }

        navigate('/vendor/dashboard');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const strength = [
    { label: 'Too weak', bar: 'bg-warning', text: 'text-warning-dark' },
    { label: 'Too weak', bar: 'bg-warning', text: 'text-warning-dark' },
    { label: 'Getting there', bar: 'bg-secondary-dark', text: 'text-secondary-dark' },
    { label: 'Good', bar: 'bg-success', text: 'text-success-dark' },
    { label: 'Strong', bar: 'bg-success', text: 'text-success-dark' },
  ][passwordScore];

  const rules = [
    ['length', '8+ characters'],
    ['upper', '1 uppercase letter'],
    ['number', '1 number'],
    ['special', '1 special character'],
  ];

  return (
    <div className="min-h-[100dvh] lg:grid lg:grid-cols-[1fr_1.02fr] xl:grid-cols-[1fr_0.92fr]">

      {/* ---------- pitch ---------- */}
      <aside className="relative hidden overflow-hidden lg:flex lg:h-[100dvh] lg:flex-col lg:justify-between lg:p-12 xl:p-14">
        <HeroArt />

        <div className="relative z-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[12.5px] font-bold text-white/90 backdrop-blur-md transition-colors hover:bg-white/20 hover:text-white"
          >
            <ArrowLeft size={14} /> Back to home
          </Link>
        </div>

        <div className="relative z-10 stagger">
          <span className="chip-live inline-flex items-center gap-1.5 border-white/30 bg-white/15 px-3 py-1 text-[9.5px] text-white backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-breathe" />
            Free to join
          </span>

          <h1 className="mt-4 max-w-[13ch] font-display text-[2.6rem] font-bold leading-[1.03] text-white xl:text-[3.1rem]">
            Sell where your customers already are.
          </h1>

          <p className="mt-4 max-w-[38ch] text-[15px] leading-relaxed text-white/80">
            HyperLocal puts your stall on the map the moment you open, and takes
            you off it when you close. No storefront, no rent, no commission on
            your first orders.
          </p>

          <ul className="mt-9 space-y-5 border-t border-white/15 pt-8">
            {SELLING_POINTS.map((point) => {
              const PointIcon = point.icon;
              return (
                <li key={point.title} className="flex items-start gap-3.5">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/90 text-white shadow-lg shadow-black/25">
                    <PointIcon size={17} />
                  </span>
                  <span>
                    <span className="block text-[13.5px] font-bold text-white">{point.title}</span>
                    <span className="block text-[12.5px] leading-snug text-white/70">{point.body}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      {/* ---------- form ---------- */}
      <main className="flex min-h-[100dvh] flex-col lg:h-[100dvh] lg:overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[28rem] flex-1 flex-col px-5 py-8 sm:px-8 lg:px-10 lg:py-12">

          <Link
            to="/"
            className="btn-ghost mb-7 inline-flex w-fit items-center gap-1.5 px-3.5 py-2 text-[12.5px] lg:hidden"
          >
            <ArrowLeft size={14} /> Back to home
          </Link>

          <header>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/30">
              <Store size={20} />
            </span>
            <h2 className="mt-4 font-display text-[1.75rem] font-bold leading-tight text-text sm:text-[2rem]">
              Create your vendor account
            </h2>
            <p className="mt-1.5 text-[13.5px] text-text-light">
              Takes about a minute. You can check in and start selling straight after.
            </p>
          </header>

          {/* The pitch panel is desktop-only, but most Kenyan vendors sign up on a
              phone - so the same three points get a compact strip here. */}
          <ul className="mt-5 flex gap-2 lg:hidden">
            {SELLING_POINTS.map((point) => {
              const PointIcon = point.icon;
              return (
                <li key={point.title} className="panel flex flex-1 flex-col items-center gap-1.5 px-2 py-3 text-center">
                  <PointIcon size={16} className="text-primary" />
                  <span className="text-[10.5px] font-bold leading-tight text-text-light">
                    {point.title}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="mt-6">
            <GoogleLoginButton role="vendor" />
            <div className="mt-5 flex items-center gap-3">
              <span className="rule flex-1" />
              <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-lighter">
                or use email
              </span>
              <span className="rule flex-1" />
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2.5 rounded-xl border border-warning/35 bg-warning/8 p-3.5 animate-fade-in"
            >
              <AlertCircle size={16} className="mt-px shrink-0 text-warning-dark" />
              <p className="text-[13px] font-semibold text-warning-dark">{error}</p>
            </div>
          )}

          <form className="mt-6 space-y-6" onSubmit={handleSubmit}>

            {/* --- the stall --- */}
            <section className="panel space-y-4 p-5">
              <h3 className="font-display text-[13px] font-bold text-text">Your stall</h3>

              <Field
                icon={Store}
                label="Business name"
                hint="This is the name customers see on the map."
                name="business_name"
                type="text"
                required
                autoComplete="organization"
                placeholder="e.g. Mama Njeri Kibandaski"
                value={formData.business_name}
                onChange={handleChange}
              />

              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-text-lighter">
                  Storefront photo <span className="normal-case tracking-normal text-text-lighter/70">— optional</span>
                </span>

                {imagePreview ? (
                  <div className="relative mt-1.5 overflow-hidden rounded-xl border border-text/10">
                    <img src={imagePreview} alt="Your storefront" className="h-36 w-full object-cover" />
                    <button
                      type="button"
                      onClick={clearImage}
                      aria-label="Remove photo"
                      className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-text/70 text-white backdrop-blur-sm transition-colors hover:bg-warning"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="group relative mt-1.5 cursor-pointer rounded-xl border-2 border-dashed border-primary/25 bg-primary/4 px-4 py-6 text-center transition-colors hover:border-primary/50 hover:bg-primary/8">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      aria-label="Upload storefront photo"
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                    <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-primary/12 text-primary transition-transform group-hover:scale-110">
                      <Upload size={18} />
                    </span>
                    <p className="mt-2 text-[13px] font-bold text-text">Add a photo of your stall</p>
                    <p className="mt-0.5 flex items-center justify-center gap-1 text-[11.5px] text-text-lighter">
                      <ImageIcon size={11} /> JPG or PNG, up to 5MB
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* --- the person --- */}
            <section className="panel space-y-4 p-5">
              <h3 className="font-display text-[13px] font-bold text-text">Your account</h3>

              <Field
                icon={User}
                label="Your name"
                name="username"
                type="text"
                required
                autoComplete="name"
                placeholder="Njeri Kamau"
                value={formData.username}
                onChange={handleChange}
              />

              <Field
                icon={Mail}
                label="Email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
              />

              <Field
                icon={Phone}
                label="M-Pesa number"
                hint="Where your payments land. Include the country code."
                name="phone_number"
                type="tel"
                required
                inputMode="tel"
                autoComplete="tel"
                placeholder="+2547XXXXXXXX"
                value={formData.phone_number}
                onChange={handleChange}
              />

              <div>
                <Field
                  icon={Lock}
                  label="Password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                >
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-lighter transition-colors hover:text-primary"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </Field>

                {formData.password.length > 0 && (
                  <div className="mt-3 animate-fade-in">
                    <div className="flex items-center gap-2.5">
                      <div className="flex flex-1 gap-1">
                        {[0, 1, 2, 3].map((i) => (
                          <span
                            key={i}
                            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                              i < passwordScore ? strength.bar : 'bg-neutral'
                            }`}
                          />
                        ))}
                      </div>
                      <span className={`text-[11px] font-extrabold ${strength.text}`}>
                        {strength.label}
                      </span>
                    </div>

                    <ul className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5">
                      {rules.map(([key, text]) => (
                        <li
                          key={key}
                          className={`flex items-center gap-1.5 text-[11.5px] transition-colors ${
                            passwordCriteria[key] ? 'font-bold text-success-dark' : 'text-text-lighter'
                          }`}
                        >
                          {passwordCriteria[key]
                            ? <Check size={12} className="shrink-0" />
                            : <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-neutral-dark" />}
                          {text}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>

            <button
              type="submit"
              disabled={loading}
              className="btn-ember flex w-full items-center justify-center gap-2 py-3.5 text-[15px] disabled:opacity-60"
            >
              {loading
                ? <><Loader2 size={17} className="animate-spin" /> Creating your account…</>
                : 'Create vendor account'}
            </button>

            <p className="text-center text-[11.5px] leading-relaxed text-text-lighter">
              By registering you agree to keep your check-ins accurate — customers
              are routed to wherever you last checked in.
            </p>
          </form>

          <p className="mt-8 border-t border-text/8 pt-6 text-center text-[13.5px] text-text-light">
            Already selling with us?{' '}
            <Link to="/vendor/login" className="font-bold text-primary hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default NewVendorRegister;
