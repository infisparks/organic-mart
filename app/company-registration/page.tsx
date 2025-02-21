'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ref as dbRef, set } from 'firebase/database';
import { storage, database, auth } from '../../lib/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';

export default function CompanyRegistration() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyPhoto, setCompanyPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleImageUpload = async (file: File) => {
    const uniqueFileName = uuidv4();
    const photoRef = storageRef(storage, `company-photos/${uniqueFileName}`);
    const uploadResult = await uploadBytes(photoRef, file);
    const downloadUrl = await getDownloadURL(uploadResult.ref);
    return downloadUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyPhoto) {
      setMessage('Please upload a company photo.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Create user with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Upload company photo and get URL
      const photoUrl = await handleImageUpload(companyPhoto);

      // Save company details in Realtime Database under the user's uid
      const companyData = {
        uid,
        companyName,
        email,
        phoneNumber,
        companyPhotoUrl: photoUrl,
      };

      const companyRef = dbRef(database, 'companies/' + uid);
      await set(companyRef, companyData);

      // Registration successful: Redirect to the dashboard
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Registration error:', error);
      setMessage(error.message || 'Error during registration. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 p-8 bg-white shadow-lg rounded-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Company Registration
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Create your company account
          </p>
        </div>
        {message && (
          <div className="p-4 bg-red-100 text-red-600 text-center rounded">
            {message}
          </div>
        )}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="companyName" className="sr-only">
                Company Name
              </label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                autoComplete="organization"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Company Name"
              />
            </div>
            <div>
              <label htmlFor="phoneNumber" className="sr-only">
                Phone Number
              </label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                autoComplete="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="mt-4 appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Phone Number"
              />
            </div>
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-4 appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-4 appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
            <div>
              <label htmlFor="companyPhoto" className="block text-sm font-medium text-gray-700 mt-4">
                Company Photo
              </label>
              <input
                id="companyPhoto"
                name="companyPhoto"
                type="file"
                accept="image/*"
                required
                onChange={(e) => setCompanyPhoto(e.target.files?.[0] || null)}
                className="mt-1 block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {loading ? 'Registering...' : 'Register Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
