import React, { useState } from 'react';
import { useRefData } from '../context/RefDataContext';
import {
  SORTED_COUNTRY_LIST,
  STATE_LIST_USA,
  ADDRESS_TYPES,
  UNIT_TYPES,
  NAME_TITLE_OPTIONS,
  NAME_SUFFIX_OPTIONS,
  GENDER_OPTIONS,
  US_CITIZEN_OPTIONS,
  PROFESSIONAL_TYPE_OPTIONS,
} from '../utils/contactOptions';
import { validateOwnershipAge } from '../utils/ownershipValidation';

interface EntityTypeOption {
  value: string;
  description?: string;
}

interface AddOwnerFormProps {
  onCancel: () => void;
  onSave: (newData: Record<string, any>) => Promise<void> | void;
  currentTotalPercentage?: number;
}

const AddOwnerForm = ({ onCancel, onSave, currentTotalPercentage = 0 }: AddOwnerFormProps) => {
  const { entityTypes, isLoading: isRefDataLoading } = useRefData();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState<Record<string, any>>({
    ownershipType: 'Organization',
    // Name
    ownerName: '',
    nameTitle: '',
    firstName: '',
    middleInitial: '',
    lastName: '',
    suffix: '',
    resortHotel: false,
    type: '',
    // Address
    addressType: 'Location Address',
    locationName: '',
    attentionName: '',
    attentionLine1: '',
    optAddrLine: '',
    unitType: '',
    unitNumber: '',
    ownershipAddr: '',
    country: 'United States',
    city: '',
    state: '',
    zip: '',
    // Contact
    phone: '',
    faxNumber: '',
    cellPhone: '',
    pagerNumber: '',
    email: '',
    webPage: '',
    // Licenses / identifiers
    fein: '',
    ssn: '',
    stateLicenseNumber: '',
    stateSalesTaxNumber: '',
    professionalLicenseType: '',
    profLicenseNumber: '',
    professionalType: '',
    professionalLicNumber: '',
    otherLicenseType: '',
    otherLicenseNumber: '',
    driversLicense: '',
    driversLicenseState: '',
    // Individual demographics
    dob: '',
    gender: '',
    usCitizen: '',
    // Descriptions / notes
    businessDescription: '',
    locationDescription: '',
    comments: '',
    // Ownership
    percentage: '',
  });

  const isIndividual = formData.ownershipType === 'Individual';

  const isApplicableForOwnershipType = (option: EntityTypeOption) => {
    const description = (option.description || '').toLowerCase();
    if (!description) return true;
    const allowsBoth = description.includes('both');
    const allowsIndividual = allowsBoth || description.includes('individual');
    const allowsOrganization =
      allowsBoth || description.includes('organization') || description.includes('organisation');
    return isIndividual ? allowsIndividual : allowsOrganization;
  };

  const filteredEntityTypes = (entityTypes || []).filter(isApplicableForOwnershipType);
  const hasSelectedEntityType =
    !!formData.type && filteredEntityTypes.some((option) => option.value === formData.type);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, type } = target;
    const value = type === 'checkbox' ? target.checked : target.value;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage(null);
  };

  const handleSave = async () => {
    if (isSubmitting) return;

    const newPct = parseFloat(String(formData.percentage || '0').replace('%', '')) || 0;
    if (currentTotalPercentage + newPct > 100) {
      const allowedMax = Math.max(0, 100 - currentTotalPercentage);
      setErrorMessage(`Total ownership cannot exceed 100%. Other owners currently hold ${currentTotalPercentage}%. You can only set this up to ${allowedMax}%.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const validation = await validateOwnershipAge(formData);
      if (validation.blocked) {
        setErrorMessage(validation.message || 'Submission blocked.');
        setIsSubmitting(false);
        return;
      }

      await onSave(formData);
    } catch (error) {
      console.error('Error saving owner:', error);
      setErrorMessage('Could not validate ownership age. Please try again.');
      setIsSubmitting(false);
    }
  };

  const isUSCountry = (formData.country || '').trim().toLowerCase() === 'united states';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        <div className="bg-[#2c3e76] text-white px-6 py-4 flex-shrink-0">
          <h2 className="text-xl font-semibold tracking-wide">
            {isIndividual ? 'Add New Individual' : 'Add New Business'}
          </h2>
        </div>

        {errorMessage && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mx-6 mt-4 flex-shrink-0">
            <p className="text-red-700 font-medium">{errorMessage}</p>
          </div>
        )}

        <div className="p-8 space-y-6 overflow-y-auto">
          {/* Ownership Type */}
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

          {/* Name section */}
          <SectionTitle>{isIndividual ? 'Name' : 'Business'}</SectionTitle>
          {isIndividual ? (
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-2">
                <SelectField label="Title" name="nameTitle" value={formData.nameTitle} onChange={handleChange} options={NAME_TITLE_OPTIONS} placeholder="--" />
              </div>
              <div className="col-span-3">
                <FormField label="First Name" name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleChange} />
              </div>
              <div className="col-span-1">
                <FormField label="M.I." name="middleInitial" placeholder="M.I." value={formData.middleInitial} onChange={handleChange} />
              </div>
              <div className="col-span-4">
                <FormField label="Last Name" name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleChange} />
              </div>
              <div className="col-span-2">
                <SelectField label="Suffix" name="suffix" value={formData.suffix} onChange={handleChange} options={NAME_SUFFIX_OPTIONS} placeholder="--" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-4 items-end">
              <div className="col-span-5">
                <FormField label="Business Name" name="ownerName" placeholder="Enter Business Name" value={formData.ownerName} onChange={handleChange} />
              </div>
              <div className="col-span-4">
                <div className="flex flex-col">
                  <label className="text-gray-500 font-medium mb-1">Business Type</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    disabled={isRefDataLoading}
                    className="border border-gray-300 rounded-md p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#2c3e76]/20 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <option value="">Select type</option>
                    {!isRefDataLoading && formData.type && !hasSelectedEntityType && (
                      <option value={formData.type}>{formData.type}</option>
                    )}
                    {isRefDataLoading ? (
                      <option>Loading options...</option>
                    ) : (
                      filteredEntityTypes.map((option) => (
                        <option key={option.value} value={option.value}>{option.value}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>
              <div className="col-span-3">
                <label className="flex items-center gap-2 cursor-pointer pb-3">
                  <input
                    type="checkbox"
                    name="resortHotel"
                    checked={!!formData.resortHotel}
                    onChange={handleChange}
                    className="w-5 h-5 accent-[#2c3e76]"
                  />
                  <span className="text-gray-800 font-medium">Resort Hotel</span>
                </label>
              </div>
            </div>
          )}

          {/* Individual type-of-contact selector keeps the contact relationship type */}
          {isIndividual && (
            <div className="grid grid-cols-2 gap-6">
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
                  {!isRefDataLoading && formData.type && !hasSelectedEntityType && (
                    <option value={formData.type}>{formData.type}</option>
                  )}
                  {isRefDataLoading ? (
                    <option>Loading options...</option>
                  ) : (
                    filteredEntityTypes.map((option) => (
                      <option key={option.value} value={option.value}>{option.value}</option>
                    ))
                  )}
                </select>
              </div>
            </div>
          )}

          {/* Address section */}
          <SectionTitle>Address</SectionTitle>
          <div className="grid grid-cols-2 gap-6">
            <SelectField label="Address Type" name="addressType" value={formData.addressType} onChange={handleChange} options={ADDRESS_TYPES} />
            {isIndividual ? (
              <FormField label="Attention Line 1" name="attentionLine1" placeholder="Attention Line 1" value={formData.attentionLine1} onChange={handleChange} />
            ) : (
              <FormField label="Location Name" name="locationName" placeholder="Location Name" value={formData.locationName} onChange={handleChange} />
            )}
          </div>

          {!isIndividual && (
            <FormField label="Attention Name" name="attentionName" placeholder="Attention Name" value={formData.attentionName} onChange={handleChange} />
          )}

          <FormField label="Opt Addr Line" name="optAddrLine" placeholder="Optional Address Line" value={formData.optAddrLine} onChange={handleChange} />

          <div className="grid grid-cols-2 gap-6">
            <SelectField label="Unit Type" name="unitType" value={formData.unitType} onChange={handleChange} options={UNIT_TYPES} placeholder="--" />
            <FormField label="Unit Number" name="unitNumber" placeholder="Unit Number" value={formData.unitNumber} onChange={handleChange} />
          </div>

          <FormField label="Street Address" name="ownershipAddr" placeholder="Street Address" value={formData.ownershipAddr} onChange={handleChange} />

          <div className="grid grid-cols-8 gap-4">
            <div className="col-span-2 flex flex-col">
              <label className="text-gray-500 font-medium mb-1">Country</label>
              <select
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="border border-gray-300 rounded-md p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#2c3e76]/20"
              >
                {SORTED_COUNTRY_LIST.map((countryName) => (
                  <option key={countryName} value={countryName}>{countryName}</option>
                ))}
              </select>
            </div>
            <div className="col-span-3">
              <FormField label="City" name="city" placeholder="City" value={formData.city} onChange={handleChange} />
            </div>
            <div className="col-span-1 flex flex-col">
              <label className="text-gray-500 font-medium mb-1">State</label>
              {isUSCountry ? (
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="border border-gray-300 rounded-md p-2.5 bg-white"
                >
                  <option value="">--</option>
                  {STATE_LIST_USA.map((stateCode) => (
                    <option key={stateCode} value={stateCode}>{stateCode}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  name="state"
                  placeholder="State"
                  value={formData.state}
                  onChange={handleChange}
                  className="border border-gray-300 rounded-md p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#2c3e76]/20"
                />
              )}
            </div>
            <div className="col-span-2">
              <FormField label="Zip" name="zip" placeholder="Zip" value={formData.zip} onChange={handleChange} />
            </div>
          </div>

          {/* Identifiers / Licenses */}
          <SectionTitle>{isIndividual ? 'Identification & License' : 'License & Tax'}</SectionTitle>

          {isIndividual ? (
            <>
              <div className="grid grid-cols-3 gap-6">
                <FormField label="DOB" name="dob" type="date" placeholder="" value={formData.dob} onChange={handleChange} subLabel="Required for Short-Term Rental Unit Property Owners." />
                <SelectField label="Gender" name="gender" value={formData.gender} onChange={handleChange} options={GENDER_OPTIONS} placeholder="--" />
                <SelectField label="U.S. Citizen" name="usCitizen" value={formData.usCitizen} onChange={handleChange} options={US_CITIZEN_OPTIONS} placeholder="--" />
              </div>
              <div className="grid grid-cols-3 gap-6">
                <FormField label="Driver's License" name="driversLicense" placeholder="Driver's License" value={formData.driversLicense} onChange={handleChange} />
                <div className="flex flex-col">
                  <label className="text-gray-500 font-medium mb-1">License State</label>
                  {isUSCountry ? (
                    <select
                      name="driversLicenseState"
                      value={formData.driversLicenseState}
                      onChange={handleChange}
                      className="border border-gray-300 rounded-md p-2.5 bg-white"
                    >
                      <option value="">--</option>
                      {STATE_LIST_USA.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      name="driversLicenseState"
                      value={formData.driversLicenseState}
                      onChange={handleChange}
                      className="border border-gray-300 rounded-md p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#2c3e76]/20"
                    />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <SelectField label="Professional Type" name="professionalType" value={formData.professionalType} onChange={handleChange} options={PROFESSIONAL_TYPE_OPTIONS} placeholder="Select Professional Type" />
                <FormField label="Professional Lic. Number" name="professionalLicNumber" placeholder="Professional Lic. Number" value={formData.professionalLicNumber} onChange={handleChange} />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <FormField label="Other License Type" name="otherLicenseType" placeholder="Other License Type" value={formData.otherLicenseType} onChange={handleChange} />
                <FormField label="Other License Number" name="otherLicenseNumber" placeholder="Other License Number" value={formData.otherLicenseNumber} onChange={handleChange} />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-6">
                <FormField label="FEIN" name="fein" placeholder="FEIN" value={formData.fein} onChange={handleChange} />
                <FormField label="State License Number" name="stateLicenseNumber" placeholder="State License Number" value={formData.stateLicenseNumber} onChange={handleChange} />
                <FormField label="State Sales Tax Number" name="stateSalesTaxNumber" placeholder="State Sales Tax Number" value={formData.stateSalesTaxNumber} onChange={handleChange} />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <SelectField label="Professional License Type" name="professionalLicenseType" value={formData.professionalLicenseType} onChange={handleChange} options={PROFESSIONAL_TYPE_OPTIONS} placeholder="--" />
                <FormField label="Prof License #" name="profLicenseNumber" placeholder="Prof License #" value={formData.profLicenseNumber} onChange={handleChange} />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <TextAreaField label="Business Description" name="businessDescription" value={formData.businessDescription} onChange={handleChange} />
                <TextAreaField label="Location Description" name="locationDescription" value={formData.locationDescription} onChange={handleChange} />
              </div>
            </>
          )}

          {/* Contact section */}
          <SectionTitle>Contact</SectionTitle>
          <div className="grid grid-cols-3 gap-6">
            <FormField label="Phone Number" name="phone" placeholder="Phone Number" value={formData.phone} onChange={handleChange} />
            <FormField label={isIndividual ? 'Fax Number' : 'FAX Number'} name="faxNumber" placeholder="Fax Number" value={formData.faxNumber} onChange={handleChange} />
            <FormField label={isIndividual ? 'Cell Number' : 'Cell Phone #'} name="cellPhone" placeholder="Cell Number" value={formData.cellPhone} onChange={handleChange} />
          </div>
          <div className="grid grid-cols-2 gap-6">
            {isIndividual ? (
              <FormField label="Pager Number" name="pagerNumber" placeholder="Pager Number" value={formData.pagerNumber} onChange={handleChange} />
            ) : (
              <FormField label="Web Page" name="webPage" placeholder="Web Page" value={formData.webPage} onChange={handleChange} />
            )}
            <FormField label="eMail Address" name="email" placeholder="eMail Address" value={formData.email} onChange={handleChange} />
          </div>

          <TextAreaField label="Comments" name="comments" value={formData.comments} onChange={handleChange} />

          {/* Ownership */}
          <SectionTitle>Ownership</SectionTitle>
          <div className="grid grid-cols-3 gap-6">
            <FormField label="Percent (%) Owned" name="percentage" placeholder="e.g. 25" value={formData.percentage} onChange={handleChange} />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-12 py-3 border-2 border-[#2c3e76] text-[#2c3e76] font-bold rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className={`px-12 py-3 bg-[#2c3e76] text-white font-bold rounded-md transition-colors shadow-lg flex items-center justify-center min-w-[140px]
                ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#1e2a52]'}`}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Adding...
                </>
              ) : (
                isIndividual ? 'Add Individual' : 'Add Business'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-sm font-bold uppercase tracking-wide text-[#2c3e76] border-b border-gray-200 pb-1 pt-2">
    {children}
  </h3>
);

interface FormFieldProps {
  label: string;
  name: string;
  placeholder: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  subLabel?: string;
}

const FormField = ({ label, name, placeholder, value, onChange, type = 'text', subLabel }: FormFieldProps) => (
  <div className="flex flex-col">
    <label className="text-gray-500 font-medium mb-1">{label}</label>
    <input
      type={type}
      name={name}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="border border-gray-300 rounded-md p-2.5 focus:outline-none focus:ring-2 focus:ring-[#2c3e76]/20 placeholder:text-gray-400"
    />
    {subLabel && <p className="text-[11px] text-gray-500 mt-1">{subLabel}</p>}
  </div>
);

interface SelectFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
  placeholder?: string;
}

const SelectField = ({ label, name, value, onChange, options, placeholder = 'Select' }: SelectFieldProps) => (
  <div className="flex flex-col">
    <label className="text-gray-500 font-medium mb-1">{label}</label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      className="border border-gray-300 rounded-md p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#2c3e76]/20"
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
);

interface TextAreaFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

const TextAreaField = ({ label, name, value, onChange }: TextAreaFieldProps) => (
  <div className="flex flex-col">
    <label className="text-gray-500 font-medium mb-1">{label}</label>
    <textarea
      name={name}
      value={value}
      onChange={onChange}
      rows={3}
      className="border border-gray-300 rounded-md p-2.5 focus:outline-none focus:ring-2 focus:ring-[#2c3e76]/20 placeholder:text-gray-400 resize-y"
    />
  </div>
);

export default AddOwnerForm;
