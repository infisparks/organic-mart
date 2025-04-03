'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ref as dbRef, set } from 'firebase/database';
import { storage, database, auth } from '../../lib/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';

export default function RegistrationForm() {
  const router = useRouter();
  const [registrationType, setRegistrationType] = useState<'vendor' | 'manufacture'>('vendor');
  const [companyName, setCompanyName] = useState('');
  const [registerNo, setRegisterNo] = useState('');
  const [companyType, setCompanyType] = useState('LLP'); // or 'Pvt'
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [isoFile, setIsoFile] = useState<File | null>(null);
  const [gstNo, setGstNo] = useState('');
  const [companyPersonName, setCompanyPersonName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [alternateNumber, setAlternateNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [certificatePreviewUrl, setCertificatePreviewUrl] = useState('');

  // General file upload function
  const uploadFile = async (file: File, folder: string) => {
    const uniqueFileName = uuidv4();
    const fileRef = storageRef(storage, `${folder}/${uniqueFileName}`);
    const uploadResult = await uploadBytes(fileRef, file);
    const downloadUrl = await getDownloadURL(uploadResult.ref);
    return downloadUrl;
  };

  // Handle certificate file change and set a preview if it is an image
  const handleCertificateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setCertificateFile(file);
    if (file && file.type.startsWith('image/')) {
      const previewUrl = URL.createObjectURL(file);
      setCertificatePreviewUrl(previewUrl);
    } else {
      setCertificatePreviewUrl('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    // Validate required fields (note: companyWebsite is optional)
    if (
      !companyName ||
      !registerNo ||
      !companyType ||
      !certificateFile ||
      !gstNo ||
      !companyPersonName ||
      !mobileNumber ||
      !alternateNumber ||
      !email ||
      !password ||
      !companyAddress
    ) {
      setMessage('Please fill in all required fields.');
      return;
    }
    // For manufacture registration the ISO file is required.
    if (registrationType === 'manufacture' && !isoFile) {
      setMessage('Please upload the ISO certificate.');
      return;
    }

    setLoading(true);

    try {
      // Create the user with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Upload the certificate file and get its URL
      const certificateUrl = await uploadFile(certificateFile, 'company-certificates');

      // Upload the ISO file if provided (for manufacture it’s required; vendor it’s optional)
      let isoUrl = '';
      if (isoFile) {
        isoUrl = await uploadFile(isoFile, 'iso-certificates');
      }

      // Prepare the registration data to be saved
      const registrationData = {
        uid,
        registrationType,
        companyName,
        registerNo,
        companyType,
        certificateUrl,
        isoUrl, // will be empty string if not provided
        gstNo,
        companyPersonName,
        mobileNumber,
        alternateNumber,
        email,
        companyWebsite: companyWebsite || '',
        companyAddress,
        status: 'pending',
      };

      // Save the registration data in the Realtime Database
      const regRef = dbRef(database, 'registrations/' + uid);
      await set(regRef, registrationData);

      // Registration successful - redirect to the dashboard or a success page
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Registration error:', error);
      setMessage(error.message || 'Error during registration. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8">
            <h1 className="text-4xl font-bold text-white text-center">
              Industrial Partner Registration
            </h1>
            <div className="flex justify-center mt-6 space-x-4">
              <button
                type="button"
                onClick={() => setRegistrationType('vendor')}
                className={`px-6 py-2 rounded-full flex items-center transition-all ${
                  registrationType === 'vendor'
                    ? 'bg-white text-blue-600 shadow-lg'
                    : 'bg-blue-500/20 text-white hover:bg-blue-500/30'
                }`}
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
                Vendor
              </button>
              <button
                type="button"
                onClick={() => setRegistrationType('manufacture')}
                className={`px-6 py-2 rounded-full flex items-center transition-all ${
                  registrationType === 'manufacture'
                    ? 'bg-white text-blue-600 shadow-lg'
                    : 'bg-blue-500/20 text-white hover:bg-blue-500/30'
                }`}
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
                </svg>
                Manufacturer
              </button>
            </div>
          </div>

          {/* Form Section */}
          <div className="p-8">
            {message && (
              <div className="mb-6 p-4 rounded-lg bg-red-100 border border-red-200 flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-red-600">{message}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Company Details */}
              <div className="space-y-5">
                {/* Company Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Company Name"
                  />
                </div>
                {/* Registration Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Registration Number *
                  </label>
                  <input
                    type="text"
                    value={registerNo}
                    onChange={(e) => setRegisterNo(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Registration Number"
                  />
                </div>
                {/* Company Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Company Type *
                  </label>
                  <select
                    value={companyType}
                    onChange={(e) => setCompanyType(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="LLP">Limited Liability Partnership (LLP)</option>
                    <option value="Pvt">Private Limited Company</option>
                  </select>
                </div>
                {/* Company Certificate Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Registered Company Certificate *
                  </label>
                  <div className="mt-1 flex justify-center items-center w-full">
                    <label className="flex flex-col w-full h-32 border-2 border-dashed hover:border-blue-500 hover:bg-blue-50 rounded-lg cursor-pointer transition-all">
                      <div className="flex flex-col justify-center items-center pt-5 pb-6">
                        <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-sm text-gray-500 mt-2">
                          {certificateFile ? certificateFile.name : 'Click to upload certificate'}
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleCertificateChange}
                        className="hidden"
                        required
                      />
                    </label>
                  </div>
                  {certificatePreviewUrl && (
                    <div className="mt-3 border rounded-lg p-2">
                      <p className="text-sm text-gray-600 mb-2">Preview:</p>
                      <img src={certificatePreviewUrl} className="max-h-40 mx-auto object-contain" alt="Certificate preview" />
                    </div>
                  )}
                </div>
                {/* ISO Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    ISO Certificate {registrationType === 'vendor' ? '(Optional)' : '*'}
                  </label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setIsoFile(e.target.files?.[0] || null)}
                    className="mt-1 block w-full text-sm text-gray-500"
                    required={registrationType === 'manufacture'}
                  />
                </div>
                {/* GST No */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    GST No *
                  </label>
                  <input
                    type="text"
                    value={gstNo}
                    onChange={(e) => setGstNo(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="GST Number"
                  />
                </div>
              </div>

              {/* Right Column - Contact Details */}
              <div className="space-y-5">
                {/* Company Person Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Company Person Name *
                  </label>
                  <input
                    type="text"
                    value={companyPersonName}
                    onChange={(e) => setCompanyPersonName(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Contact Person Name"
                  />
                </div>
                {/* Mobile Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Mobile Number"
                  />
                </div>
                {/* Alternate Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Alternate Number *
                  </label>
                  <input
                    type="tel"
                    value={alternateNumber}
                    onChange={(e) => setAlternateNumber(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Alternate Number"
                  />
                </div>
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Email Address"
                  />
                </div>
                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Password"
                  />
                </div>
              </div>

              {/* Full-width Fields */}
              <div className="md:col-span-2 space-y-5">
                {/* Company Website (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Company Website (Optional)
                  </label>
                  <input
                    type="url"
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="https://example.com"
                  />
                </div>
                {/* Company Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Company Address *
                  </label>
                  <textarea
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Company Address"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="md:col-span-2 pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-all flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    'Complete Registration'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
