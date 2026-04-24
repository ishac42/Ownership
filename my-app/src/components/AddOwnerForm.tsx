import React, { useState } from 'react';
import { useRefData } from '../context/RefDataContext';

interface AddOwnerFormProps {
  onCancel: () => void;
  // Updated to allow Promise for async operations
  onSave: (newData: any) => Promise<void> | void; 
  currentTotalPercentage?: number; // Passed from parent to calculate limits
}

const AddOwnerForm = ({ onCancel, onSave, currentTotalPercentage = 0 }: AddOwnerFormProps) => {
  const { entityTypes, isLoading: isRefDataLoading } = useRefData();

  // 1. ADD LOADING & ERROR STATE
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    ownershipType: 'Organization',
    ownerName: '',
    firstName: '', // <-- Added for Individual
    lastName: '',  // <-- Added for Individual
    type: '',
    ownershipAddr: '',
    city: '',
    state: '',
    zip: '',
    email: '',
    phone: '',
    fein: '',
    ssn: '',
    percentage: ''
  });

  const STATE_LIST_USA = [
    'AK', 'AL', 'AR', 'AZ', 'CA', 'CO', 'CT', 'DC', 'DE', 'FL', 'GA', 'HI', 'IA', 'ID', 'IL', 'IN', 'KS', 'KY', 'LA', 
    'MA', 'MD', 'ME', 'MI', 'MN', 'MO', 'MS', 'MT', 'NC', 'ND', 'NE', 'NH', 'NJ', 'NM', 'NV', 'NY', 'OH', 'OK', 'OR', 
    'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VA', 'VT', 'WA', 'WI', 'WV', 'WY'
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear the error message as soon as the user starts typing again
    if (errorMessage) setErrorMessage(null);
  };

  // 2. CREATE A SUBMIT HANDLER
  const handleSave = async () => {
    if (isSubmitting) return; // Prevent double execution
    
    // --- PERCENTAGE VALIDATION ---
    const newPct = parseFloat(String(formData.percentage || '0').replace('%', '')) || 0;
    
    // Check if adding this new percentage exceeds 100%
    if (currentTotalPercentage + newPct > 100) {
      const allowedMax = Math.max(0, 100 - currentTotalPercentage);
      setErrorMessage(`Total ownership cannot exceed 100%. Other owners currently hold ${currentTotalPercentage}%. You can only set this up to ${allowedMax}%.`);
      return; // Stop submission
    }
    // ------------------------------

    setIsSubmitting(true);

    try {
      // We await the onSave in case the parent performs an async API call
      await onSave(formData);
    } catch (error) {
      console.error("Error saving owner:", error);
      setIsSubmitting(false); // Re-enable button if there was an error
    }
    // If successful, we usually don't need to set false because the modal will close/unmount
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Navy Header */}
        <div className="bg-[#2c3e76] text-white px-6 py-4 flex-shrink-0">
          <h2 className="text-xl font-semibold tracking-wide">Add Ownership</h2>
        </div>

        {/* Validation Error Banner */}
        {errorMessage && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mx-6 mt-4 flex-shrink-0">
            <p className="text-red-700 font-medium">{errorMessage}</p>
          </div>
        )}

        <div className="p-8 space-y-6 overflow-y-auto">
          {/* Ownership Type Radio Buttons */}
          <section>
            <label className="block text-gray-900 font-bold text-lg mb-3">Ownership Type</label>
            <div className="flex gap-8">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="ownershipType" 
                  value="Individual" 
                  checked={formData.ownershipType === 'Individual'}
                  onChange={handleChange}
                  className="w-5 h-5 accent-[#2c3e76]"
                />
                <span className="text-gray-800 font-medium">Individual</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="ownershipType" 
                  value="Organization" 
                  checked={formData.ownershipType === 'Organization'}
                  onChange={handleChange}
                  className="w-5 h-5 accent-[#2c3e76]"
                />
                <span className="text-gray-800 font-medium">Organization</span>
              </label>
            </div>
          </section>

          {/* Row 1: Name and Entity Type */}
          <div className="grid grid-cols-2 gap-6">
            
            {/* Conditionally render Name fields based on Ownership Type */}
            {formData.ownershipType === 'Individual' ? (
              <div className="grid grid-cols-2 gap-4">
                <FormField label="First Name" name="firstName" placeholder="Enter First Name" value={formData.firstName} onChange={handleChange} />
                <FormField label="Last Name" name="lastName" placeholder="Enter Last Name" value={formData.lastName} onChange={handleChange} />
              </div>
            ) : (
              <FormField label="Ownership Entity Name" name="ownerName" placeholder="Enter Entity Name" value={formData.ownerName} onChange={handleChange} />
            )}
            
            <div className="flex flex-col">
              <label className="text-gray-500 font-medium mb-1">Type of Entity</label>
              <select 
                name="type"
                value={formData.type}
                onChange={handleChange}
                disabled={isRefDataLoading}
                className="border border-gray-300 rounded-md p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#2c3e76]/20 disabled:bg-gray-100 disabled:text-gray-400"
              >
                <option value="">Select type</option>
                {isRefDataLoading ? (
                    <option>Loading options...</option>
                ) : (
                    entityTypes.map((type: string) => (
                        <option key={type} value={type}>
                            {type}
                        </option>
                    ))
                )}
              </select>
            </div>
          </div>

          {/* Row 2: Address Details */}
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-1">
              <FormField label="Ownership Address" name="ownershipAddr" placeholder="Enter address" value={formData.ownershipAddr} onChange={handleChange} />
            </div>
            <div className="flex flex-col">
              <label className="text-gray-500 font-medium mb-1">City</label>
              <input
                type="text"
                name="city"
                placeholder="Enter city"
                value={formData.city}
                onChange={handleChange}
                className="border border-gray-300 rounded-md p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#2c3e76]/20"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-gray-500 font-medium mb-1">State</label>
              <select 
                name="state" 
                value={formData.state} 
                onChange={handleChange} 
                className="border border-gray-300 rounded-md p-2.5 bg-white"
              >
                <option value="">Select state</option>
                {STATE_LIST_USA.map((stateCode) => (
                  <option key={stateCode} value={stateCode}>
                    {stateCode}
                  </option>
                ))}
              </select>
            </div>
            <FormField label="Zip Code" name="zip" placeholder="Enter zip code" value={formData.zip} onChange={handleChange} />
          </div>

          {/* Row 3: Email and Phone */}
          <div className="grid grid-cols-2 gap-6">
            <FormField label="Email" name="email" placeholder="Enter email address" value={formData.email} onChange={handleChange} />
            <FormField label="Phone Number" name="phone" placeholder="e.g. 1234567890" value={formData.phone} onChange={handleChange} />
          </div>

          {/* Row 4: FEIN, SSN, Percentage */}
          <div className="grid grid-cols-3 gap-6">
            <FormField label="FEIN" name="fein" placeholder="Enter FEIN" value={formData.fein} onChange={handleChange} />
            <FormField label="SSN" name="ssn" placeholder="Enter SSN" value={formData.ssn} onChange={handleChange} />
            <FormField label="Percent (%) Owned" name="percentage" placeholder="e.g. 25" value={formData.percentage} onChange={handleChange} />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-4">
            <button 
              type="button"
              onClick={onCancel}
              disabled={isSubmitting} // Disable cancel during submit
              className="px-12 py-3 border-2 border-[#2c3e76] text-[#2c3e76] font-bold rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            
            {/* 3. UPDATED ADD BUTTON */}
            <button 
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className={`px-12 py-3 bg-[#2c3e76] text-white font-bold rounded-md transition-colors shadow-lg flex items-center justify-center min-w-[140px]
                ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#1e2a52]'}`}
            >
              {isSubmitting ? (
                <>
                  {/* Simple CSS Spinner */}
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Adding...
                </>
              ) : (
                'Add'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper component 
const FormField = ({ label, name, placeholder, value, onChange }: any) => (
  <div className="flex flex-col">
    <label className="text-gray-500 font-medium mb-1">{label}</label>
    <input 
      type="text"
      name={name}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="border border-gray-300 rounded-md p-2.5 focus:outline-none focus:ring-2 focus:ring-[#2c3e76]/20 placeholder:text-gray-400"
    />
  </div>
);

export default AddOwnerForm;