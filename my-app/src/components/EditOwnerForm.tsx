import { useRefData } from '../context/RefDataContext';

// 1. Define the State List Constant
const STATE_LIST_USA = [
  'AK', 'AL', 'AR', 'AZ', 'CA', 'CO', 'CT', 'DC', 'DE', 'FL', 'GA', 'HI', 'IA', 'ID', 'IL', 'IN', 'KS', 'KY', 'LA', 
  'MA', 'MD', 'ME', 'MI', 'MN', 'MO', 'MS', 'MT', 'NC', 'ND', 'NE', 'NH', 'NJ', 'NM', 'NV', 'NY', 'OH', 'OK', 'OR', 
  'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VA', 'VT', 'WA', 'WI', 'WV', 'WY'
];
const COUNTRY_LIST = [
  'United States', 'Canada', 'Mexico', 'United Kingdom', 'Ireland', 'Germany', 'France', 'Spain', 'Italy', 'Netherlands',
  'Belgium', 'Switzerland', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Poland', 'Portugal', 'Austria', 'Czech Republic',
  'Hungary', 'Romania', 'Greece', 'Turkey', 'Ukraine', 'India', 'China', 'Japan', 'South Korea', 'Singapore',
  'Malaysia', 'Thailand', 'Indonesia', 'Philippines', 'Vietnam', 'Australia', 'New Zealand', 'Brazil', 'Argentina', 'Chile',
  'Colombia', 'Peru', 'South Africa', 'Nigeria', 'Kenya', 'Egypt', 'United Arab Emirates', 'Saudi Arabia', 'Israel', 'Other'
];
const SORTED_COUNTRY_LIST = [...COUNTRY_LIST].sort((a, b) => a.localeCompare(b));

interface EditOwnerFormProps {
  formData: any;
  setFormData: (data: any) => void;
  onUpdate: () => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  totalChildrenPercentage?: number; 
  isRoot?: boolean;
  currentTotalPercentage?: number;
  originalPercentage?: number;
  isFromList?: boolean;
}

const EditOwnerForm = ({ 
  formData, 
  setFormData, 
  onUpdate, 
  onCancel, 
  isLoading,
  totalChildrenPercentage = 0,
  isRoot = false, // NEW
  isFromList = false
}: EditOwnerFormProps) => {

  const { entityTypes, isLoading: isRefDataLoading } = useRefData();

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const entityType = formData.type || formData.contactType || "";
  const selectedCountry = formData.country || 'United States';
  const hasSelectedCountryOption = COUNTRY_LIST.includes(selectedCountry);
  const isUSCountry = selectedCountry.trim().toLowerCase() === 'united states';

  const isTypeSelected = (type: string) => 
    formData.ownershipType?.toLowerCase() === type.toLowerCase();

  // UPDATED: Logic to only force calculation if it's the ROOT parent with children
 const hasChildren = totalChildrenPercentage > 0;
  const shouldShowCalculatedValue = hasChildren && (isRoot || isFromList);

  return (
    <div className="p-8 bg-[#f0f4f8] space-y-7 text-[#333]">
      
      {/* Ownership Type Radio Group */}
      <div>
        <h3 className="text-[22px] font-bold text-gray-900 mb-4">Ownership Type</h3>
        <div className="flex gap-10">
          <label className={`flex items-center gap-3 font-semibold text-gray-800 ${isLoading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
            <input 
              type="radio" 
              name="ownershipType"
              disabled={isLoading}
              className="w-5 h-5 accent-[#2c3e76] border-gray-300" 
              checked={isTypeSelected('Individual')}
              onChange={() => handleChange('ownershipType', 'Individual')}
            /> Individual
          </label>
          <label className={`flex items-center gap-3 font-semibold text-gray-800 ${isLoading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
            <input 
              type="radio" 
              name="ownershipType"
              disabled={isLoading}
              className="w-5 h-5 accent-[#2c3e76] border-gray-300" 
              checked={isTypeSelected('Organization')}
              onChange={() => handleChange('ownershipType', 'Organization')}
            /> Organization
          </label>
        </div>
      </div>

      {/* Row 1: Name and Type */}
      <div className="grid grid-cols-2 gap-6">
        {isTypeSelected('Individual') ? (
          <div className="grid grid-cols-2 gap-4">
            <InputField 
              label="First Name" 
              value={formData.firstName} 
              onChange={(v: string) => handleChange('firstName', v)}
              disabled={isLoading}
            />
            <InputField 
              label="Last Name" 
              value={formData.lastName} 
              onChange={(v: string) => handleChange('lastName', v)}
              disabled={isLoading}
            />
          </div>
        ) : (
          <InputField 
            label="Ownership Entity Name" 
            value={formData.ownerName} 
            onChange={(v: string) => handleChange('ownerName', v)}
            disabled={isLoading}
          />
        )}
        
        <div className="flex flex-col text-left">
          <label className="text-gray-500 font-medium mb-1">Type of Entity</label>
          <select 
            name="type"
            value={entityType}
            onChange={(e) => handleChange('type', e.target.value)}
            disabled={isLoading || isRefDataLoading}
            className="border border-gray-300 rounded-md p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#2c3e76]/20 disabled:bg-gray-100 disabled:text-gray-400 w-full"
          >
            <option value="">Select type</option>
            {isRefDataLoading ? (
                <option disabled>Loading options...</option>
            ) : (
                entityTypes?.map((type: string) => (
                    <option key={type} value={type}>
                        {type}
                    </option>
                ))
            )}
          </select>
        </div>
      </div>

      {/* Row 2: Address Details */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-3">
          <InputField 
            label="Ownership Address" 
            value={
              formData.ownershipAddr || 
              `${formData.contactAddress || ''} ${formData.city || ''} ${formData.state || ''} ${formData.zip || ''}`.trim()
            } 
            onChange={(v: string) => handleChange('ownershipAddr', v)} 
            subLabel="(For example: 1100 4th St SW)" 
            disabled={isLoading}
          />
        </div>
        <div className="col-span-3">
          <div className="w-full text-left">
            <label className={`block text-gray-600 text-[15px] font-bold mb-1.5 ${isLoading ? 'opacity-60' : ''}`}>
              Country
            </label>
            <select
              value={selectedCountry}
              onChange={(e) => handleChange('country', e.target.value)}
              disabled={isLoading}
              className={`w-full p-2.5 border border-gray-400 rounded-md bg-white text-gray-900 font-medium outline-none transition-shadow ${
                isLoading 
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                  : 'focus:ring-2 focus:ring-[#2c3e76]/10'
              }`}
            >
              {!hasSelectedCountryOption && (
                <option value={selectedCountry}>{selectedCountry}</option>
              )}
              {SORTED_COUNTRY_LIST.map((countryName) => (
                <option key={countryName} value={countryName}>{countryName}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="col-span-3">
          <InputField label="City" value={formData.city} onChange={(v: string) => handleChange('city', v)} disabled={isLoading} />
        </div>
        
        <div className="col-span-1 flex flex-col text-left">
          <label className={`block text-gray-600 text-[15px] font-bold mb-1.5 ${isLoading ? 'opacity-60' : ''}`}>
            {isUSCountry ? 'State' : 'State'}
          </label>
          {isUSCountry ? (
            <select 
              value={formData.state || ''} 
              onChange={(e) => handleChange('state', e.target.value)} 
              disabled={isLoading}
              className={`w-full p-2.5 border border-gray-400 rounded-md bg-white text-gray-900 font-medium outline-none transition-shadow ${
                 isLoading 
                   ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                   : 'focus:ring-2 focus:ring-[#2c3e76]/10'
              }`}
            >
              <option value="">Select</option>
              {STATE_LIST_USA.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={formData.state || ''}
              onChange={(e) => handleChange('state', e.target.value)}
              disabled={isLoading}
              className={`w-full p-2.5 border border-gray-400 rounded-md bg-white text-gray-900 font-medium outline-none transition-shadow ${
                 isLoading 
                   ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                   : 'focus:ring-2 focus:ring-[#2c3e76]/10'
              }`}
            />
          )}
        </div>

        <div className="col-span-2">
          <InputField label="Zip/Postal Code" value={formData.zip} onChange={(v: string) => handleChange('zip', v)} disabled={isLoading} />
        </div>
      </div>

      {/* Row 3: Contact Info */}
      <div className="grid grid-cols-2 gap-6">
        <InputField label="Email" value={formData.email} onChange={(v: string) => handleChange('email', v)} disabled={isLoading} />
        <InputField label="Phone Number" value={formData.phone} onChange={(v: string) => handleChange('phone', v)} disabled={isLoading} />
      </div>

      {/* Row 4: Identifiers */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-3">
          <InputField label="FEIN" value={formData.fein} onChange={(v: string) => handleChange('fein', v)} disabled={isLoading} />
        </div>
        <div className="col-span-3">
          <InputField label="SSN" value={formData.ssn} onChange={(v: string) => handleChange('ssn', v)} disabled={isLoading} />
        </div>
        <div className="col-span-6">
          {/* UPDATED: Displays child-sum ONLY if isRoot. Otherwise shows manual formData.percentage */}
          <InputField 
            label="Percent (%) Owned" 
            value={shouldShowCalculatedValue ? totalChildrenPercentage : formData.percentage} 
            onChange={(v: string) => handleChange('percentage', v)} 
            disabled={isLoading || shouldShowCalculatedValue}
            subLabel={shouldShowCalculatedValue ? "Total sum of all owners" : ""} 
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-5 pt-6">
        <button 
          onClick={onCancel} 
          disabled={isLoading}
          className={`px-14 py-2.5 border-2 border-[#2c3e76] text-[#2c3e76] font-bold rounded-md bg-white transition-all shadow-sm ${
            isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
          }`}
        >
          Cancel
        </button>
        
        <button 
          onClick={onUpdate} 
          disabled={isLoading}
          className={`px-14 py-2.5 bg-[#2c3e76] text-white font-bold rounded-md transition-all shadow-md flex items-center justify-center min-w-[160px] ${
            isLoading ? 'opacity-70 cursor-wait' : 'hover:bg-[#1e2a52]'
          }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Updating...
            </>
          ) : (
            "Update"
          )}
        </button>
      </div>
    </div>
  );
};

// Internal reusable InputField
interface InputFieldProps {
  label: string;
  value: any;
  onChange: (val: string) => void;
  subLabel?: string;
  disabled?: boolean;
}

const InputField = ({ label, value, onChange, subLabel, disabled }: InputFieldProps) => (
  <div className="w-full text-left">
    <label className={`block text-gray-600 text-[15px] font-bold mb-1.5 ${disabled ? 'opacity-60' : ''}`}>
      {label}
    </label>
    <input 
      type="text" 
      value={value || ''} 
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`w-full p-2.5 border border-gray-400 rounded-md bg-white text-gray-900 font-medium outline-none transition-shadow ${
        disabled 
          ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
          : 'focus:ring-2 focus:ring-[#2c3e76]/10'
      }`}
    />
    {subLabel && <p className={`text-[11px] text-gray-500 mt-1 font-medium ${disabled ? 'opacity-60' : ''}`}>{subLabel}</p>}
  </div>
);

export default EditOwnerForm;