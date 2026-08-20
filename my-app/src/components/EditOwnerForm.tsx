import { useRefData } from '../context/RefDataContext';
import {
  COUNTRY_LIST,
  SORTED_COUNTRY_LIST,
  STATE_LIST_USA,
  ADDRESS_TYPES,
  UNIT_TYPES,
  NAME_SUFFIX_OPTIONS,
  GENDER_OPTIONS,
  US_CITIZEN_OPTIONS,
  PROFESSIONAL_TYPE_OPTIONS,
} from '../utils/contactOptions';

interface EntityTypeOption {
  value: string;
  description?: string;
}

interface EditOwnerFormProps {
  formData: Record<string, string>;
  setFormData: (data: Record<string, string>) => void;
  onUpdate: () => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  totalChildrenPercentage?: number;
  isRoot?: boolean;
  currentTotalPercentage?: number;
  originalPercentage?: number;
  isFromList?: boolean;
  showStatusField?: boolean;
}

const EditOwnerForm = ({
  formData,
  setFormData,
  onUpdate,
  onCancel,
  isLoading,
  totalChildrenPercentage = 0,
  isRoot = false,
  isFromList = false,
  showStatusField = false,
}: EditOwnerFormProps) => {

  const { entityTypes, isLoading: isRefDataLoading } = useRefData();

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const entityType = formData.type || formData.contactType || '';
  const selectedCountry = formData.country || 'United States';
  const hasSelectedCountryOption = COUNTRY_LIST.includes(selectedCountry);
  const isUSCountry = selectedCountry.trim().toLowerCase() === 'united states';

  const isTypeSelected = (type: string) =>
    formData.ownershipType?.toLowerCase() === type.toLowerCase();
  const isIndividual = isTypeSelected('Individual');

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
    !!entityType && filteredEntityTypes.some((option) => option.value === entityType);

  const hasChildren = totalChildrenPercentage > 0;
  const shouldShowCalculatedValue = hasChildren && (isRoot || isFromList);

  return (
    <div className="p-8 bg-[#f0f4f8] space-y-7 text-[#333]">

      {/* Ownership Type */}
      <div>
        <h3 className="text-[22px] font-bold text-gray-900 mb-4">Ownership Type</h3>
        <div className="flex gap-10">
          <label className={`flex items-center gap-3 font-semibold text-gray-800 ${isLoading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
            <input
              type="radio"
              name="ownershipType"
              disabled={isLoading}
              className="w-5 h-5 accent-[#2c3e76] border-gray-300"
              checked={isIndividual}
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

      {showStatusField && (
      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col">
          <label htmlFor="edit-status" className="text-gray-600 font-medium mb-1">Status</label>
          <select
            id="edit-status"
            value={formData.status || 'Active'}
            onChange={(e) => handleChange('status', e.target.value)}
            disabled={isLoading}
            className={`w-full p-2.5 border border-gray-400 rounded-md bg-white text-gray-900 font-medium outline-none transition-shadow ${
              isLoading
                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                : 'focus:ring-2 focus:ring-[#2c3e76]/10'
            }`}
          >
            <option value="Active">Active</option>
            <option value="Terminated">Terminated</option>
          </select>
        </div>
      </div>
      )}

      {/* Name */}
      <SectionTitle>{isIndividual ? 'Name' : 'Business'}</SectionTitle>
      {isIndividual ? (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-4">
            <InputField label="First Name" value={formData.firstName} onChange={(v) => handleChange('firstName', v)} disabled={isLoading} />
          </div>
          <div className="col-span-1">
            <InputField label="M.I." value={formData.middleInitial} onChange={(v) => handleChange('middleInitial', v)} disabled={isLoading} />
          </div>
          <div className="col-span-5">
            <InputField label="Last Name" value={formData.lastName} onChange={(v) => handleChange('lastName', v)} disabled={isLoading} />
          </div>
          <div className="col-span-2">
            <SelectField label="Suffix" value={formData.suffix} onChange={(v) => handleChange('suffix', v)} options={NAME_SUFFIX_OPTIONS} disabled={isLoading} placeholder="--" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-4 items-end">
          <div className="col-span-5">
            <InputField label="Business Name" value={formData.ownerName} onChange={(v) => handleChange('ownerName', v)} disabled={isLoading} />
          </div>
          <div className="col-span-4">
            <EntityTypeSelect
              entityType={entityType}
              filteredEntityTypes={filteredEntityTypes}
              hasSelectedEntityType={hasSelectedEntityType}
              isLoading={isLoading}
              isRefDataLoading={isRefDataLoading}
              onChange={(v) => handleChange('type', v)}
              label="Entity Type"
            />
          </div>
          <div className="col-span-3">
            <label className={`flex items-center gap-3 font-semibold text-gray-800 pb-3 ${isLoading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
              <input
                type="checkbox"
                disabled={isLoading}
                className="w-5 h-5 accent-[#2c3e76]"
                checked={!!formData.resortHotel && formData.resortHotel !== 'N'}
                onChange={(e) => handleChange('resortHotel', e.target.checked ? 'Y' : 'N')}
              /> Resort Hotel
            </label>
          </div>
        </div>
      )}

      {isIndividual && (
        <div className="grid grid-cols-2 gap-6">
          <EntityTypeSelect
            entityType={entityType}
            filteredEntityTypes={filteredEntityTypes}
            hasSelectedEntityType={hasSelectedEntityType}
            isLoading={isLoading}
            isRefDataLoading={isRefDataLoading}
            onChange={(v) => handleChange('type', v)}
            label="Ownership Title"
          />
        </div>
      )}

      {/* Address */}
      <SectionTitle>Address</SectionTitle>
      <div className="grid grid-cols-2 gap-6">
        <SelectField label="Address Type" value={formData.addressType} onChange={(v) => handleChange('addressType', v)} options={ADDRESS_TYPES} disabled={isLoading} placeholder="Select" />
        {isIndividual ? (
          <InputField label="Attention Line 1" value={formData.attentionLine1} onChange={(v) => handleChange('attentionLine1', v)} disabled={isLoading} />
        ) : (
          <InputField label="Location Name" value={formData.locationName} onChange={(v) => handleChange('locationName', v)} disabled={isLoading} />
        )}
      </div>

      {!isIndividual && (
        <InputField label="Attention Name" value={formData.attentionName} onChange={(v) => handleChange('attentionName', v)} disabled={isLoading} />
      )}

      <InputField label="Opt Addr Line" value={formData.optAddrLine} onChange={(v) => handleChange('optAddrLine', v)} disabled={isLoading} />

      <div className="grid grid-cols-2 gap-6">
        <SelectField label="Unit Type" value={formData.unitType} onChange={(v) => handleChange('unitType', v)} options={UNIT_TYPES} disabled={isLoading} placeholder="--" />
        <InputField label="Unit Number" value={formData.unitNumber} onChange={(v) => handleChange('unitNumber', v)} disabled={isLoading} />
      </div>

      <InputField
        label="Street Address"
        value={
          formData.ownershipAddr ||
          `${formData.contactAddress || ''}`.trim()
        }
        onChange={(v) => handleChange('ownershipAddr', v)}
        subLabel="(For example: 1100 4th St SW)"
        disabled={isLoading}
      />

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-3">
          <div className="w-full text-left">
            <label htmlFor="edit-country" className={`block text-gray-600 text-[15px] font-bold mb-1.5 ${isLoading ? 'opacity-60' : ''}`}>Country</label>
            <select
              id="edit-country"
              value={selectedCountry}
              onChange={(e) => handleChange('country', e.target.value)}
              disabled={isLoading}
              className={selectClass(isLoading)}
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
        <div className="col-span-4">
          <InputField label="City" value={formData.city} onChange={(v) => handleChange('city', v)} disabled={isLoading} />
        </div>
        <div className="col-span-2 flex flex-col text-left">
          <label htmlFor="edit-state" className={`block text-gray-600 text-[15px] font-bold mb-1.5 ${isLoading ? 'opacity-60' : ''}`}>State</label>
          {isUSCountry ? (
            <select
              id="edit-state"
              value={formData.state || ''}
              onChange={(e) => handleChange('state', e.target.value)}
              disabled={isLoading}
              className={selectClass(isLoading)}
            >
              <option value="">Select</option>
              {STATE_LIST_USA.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          ) : (
            <input
              id="edit-state"
              type="text"
              value={formData.state || ''}
              onChange={(e) => handleChange('state', e.target.value)}
              disabled={isLoading}
              className={selectClass(isLoading)}
            />
          )}
        </div>
        <div className="col-span-3">
          <InputField label="Zip/Postal Code" value={formData.zip} onChange={(v) => handleChange('zip', v)} disabled={isLoading} />
        </div>
      </div>

      {/* Identifiers / Licenses */}
      <SectionTitle>{isIndividual ? 'Identification & License' : 'License & Tax'}</SectionTitle>
      {isIndividual ? (
        <>
          <div className="grid grid-cols-3 gap-6">
            <InputField label="DOB" type="date" value={formData.dob} onChange={(v) => handleChange('dob', v)} disabled={isLoading} subLabel="Required for Short-Term Rental Unit Property Owners." />
            <SelectField label="Gender" value={formData.gender} onChange={(v) => handleChange('gender', v)} options={GENDER_OPTIONS} disabled={isLoading} placeholder="--" />
            <SelectField label="U.S. Citizen" value={formData.usCitizen} onChange={(v) => handleChange('usCitizen', v)} options={US_CITIZEN_OPTIONS} disabled={isLoading} placeholder="--" />
          </div>
          <div className="grid grid-cols-3 gap-6">
            <InputField label="Driver's License" value={formData.driversLicense} onChange={(v) => handleChange('driversLicense', v)} disabled={isLoading} />
            <div className="flex flex-col text-left">
              <label htmlFor="edit-license-state" className={`block text-gray-600 text-[15px] font-bold mb-1.5 ${isLoading ? 'opacity-60' : ''}`}>License State</label>
              {isUSCountry ? (
                <select
                  id="edit-license-state"
                  value={formData.driversLicenseState || ''}
                  onChange={(e) => handleChange('driversLicenseState', e.target.value)}
                  disabled={isLoading}
                  className={selectClass(isLoading)}
                >
                  <option value="">--</option>
                  {STATE_LIST_USA.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              ) : (
                <input
                  id="edit-license-state"
                  type="text"
                  value={formData.driversLicenseState || ''}
                  onChange={(e) => handleChange('driversLicenseState', e.target.value)}
                  disabled={isLoading}
                  className={selectClass(isLoading)}
                />
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <SelectField label="Professional Type" value={formData.professionalType} onChange={(v) => handleChange('professionalType', v)} options={PROFESSIONAL_TYPE_OPTIONS} disabled={isLoading} placeholder="Select Professional Type" />
            <InputField label="Professional Lic. Number" value={formData.professionalLicNumber} onChange={(v) => handleChange('professionalLicNumber', v)} disabled={isLoading} />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <InputField label="Other License Type" value={formData.otherLicenseType} onChange={(v) => handleChange('otherLicenseType', v)} disabled={isLoading} />
            <InputField label="Other License Number" value={formData.otherLicenseNumber} onChange={(v) => handleChange('otherLicenseNumber', v)} disabled={isLoading} />
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-6">
            <InputField label="FEIN" value={formData.fein} onChange={(v) => handleChange('fein', v)} disabled={isLoading} />
            <InputField label="State License Number" value={formData.stateLicenseNumber} onChange={(v) => handleChange('stateLicenseNumber', v)} disabled={isLoading} />
            <InputField label="State Sales Tax Number" value={formData.stateSalesTaxNumber} onChange={(v) => handleChange('stateSalesTaxNumber', v)} disabled={isLoading} />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <SelectField label="Professional License Type" value={formData.professionalLicenseType} onChange={(v) => handleChange('professionalLicenseType', v)} options={PROFESSIONAL_TYPE_OPTIONS} disabled={isLoading} placeholder="--" />
            <InputField label="Prof License #" value={formData.profLicenseNumber} onChange={(v) => handleChange('profLicenseNumber', v)} disabled={isLoading} />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <TextAreaField label="Business Description" value={formData.businessDescription} onChange={(v) => handleChange('businessDescription', v)} disabled={isLoading} />
            <TextAreaField label="Location Description" value={formData.locationDescription} onChange={(v) => handleChange('locationDescription', v)} disabled={isLoading} />
          </div>
        </>
      )}

      {/* Contact */}
      <SectionTitle>Contact</SectionTitle>
      <div className="grid grid-cols-3 gap-6">
        <InputField label="Phone Number" value={formData.phone} onChange={(v) => handleChange('phone', v)} disabled={isLoading} />
        <InputField label={isIndividual ? 'Fax Number' : 'FAX Number'} value={formData.faxNumber} onChange={(v) => handleChange('faxNumber', v)} disabled={isLoading} />
        <InputField label={isIndividual ? 'Cell Number' : 'Cell Phone #'} value={formData.cellPhone} onChange={(v) => handleChange('cellPhone', v)} disabled={isLoading} />
      </div>
      <div className="grid grid-cols-2 gap-6">
        {isIndividual ? (
          <InputField label="Pager Number" value={formData.pagerNumber} onChange={(v) => handleChange('pagerNumber', v)} disabled={isLoading} />
        ) : (
          <InputField label="Web Page" value={formData.webPage} onChange={(v) => handleChange('webPage', v)} disabled={isLoading} />
        )}
        <InputField label="eMail Address" value={formData.email} onChange={(v) => handleChange('email', v)} disabled={isLoading} />
      </div>

      <TextAreaField label="Comments" value={formData.comments} onChange={(v) => handleChange('comments', v)} disabled={isLoading} />

      {/* Ownership */}
      <SectionTitle>Ownership</SectionTitle>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-6">
          <InputField
            label="Percent (%) Owned"
            value={shouldShowCalculatedValue ? totalChildrenPercentage : formData.percentage}
            onChange={(v) => handleChange('percentage', v)}
            disabled={isLoading || shouldShowCalculatedValue}
            subLabel={shouldShowCalculatedValue ? 'Total sum of all owners' : ''}
          />
        </div>
      </div>

      {/* Actions */}
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
            'Update'
          )}
        </button>
      </div>
    </div>
  );
};

const selectClass = (isLoading: boolean) =>
  `w-full p-2.5 border border-gray-400 rounded-md bg-white text-gray-900 font-medium outline-none transition-shadow ${
    isLoading ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'focus:ring-2 focus:ring-[#2c3e76]/10'
  }`;

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-sm font-bold uppercase tracking-wide text-[#2c3e76] border-b border-gray-300 pb-1 pt-1">
    {children}
  </h3>
);

interface EntityTypeSelectProps {
  entityType: string;
  filteredEntityTypes: EntityTypeOption[];
  hasSelectedEntityType: boolean;
  isLoading: boolean;
  isRefDataLoading: boolean;
  onChange: (value: string) => void;
  label: string;
}

const fieldIdFromLabel = (label: string) =>
  `edit-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

const EntityTypeSelect = ({
  entityType,
  filteredEntityTypes,
  hasSelectedEntityType,
  isLoading,
  isRefDataLoading,
  onChange,
  label
}: EntityTypeSelectProps) => {
  const fieldId = fieldIdFromLabel(label);
  return (
  <div className="flex flex-col text-left">
    <label htmlFor={fieldId} className={`block text-gray-600 text-[15px] font-bold mb-1.5 ${isLoading ? 'opacity-60' : ''}`}>{label}</label>
    <select
      id={fieldId}
      value={entityType}
      onChange={(e) => onChange(e.target.value)}
      disabled={isLoading || isRefDataLoading}
      className={selectClass(isLoading)}
    >
      <option value="">Select type</option>
      {!isRefDataLoading && entityType && !hasSelectedEntityType && (
        <option value={entityType}>{entityType}</option>
      )}
      {isRefDataLoading ? (
        <option disabled>Loading options...</option>
      ) : (
        filteredEntityTypes.map((option) => (
          <option key={option.value} value={option.value}>{option.value}</option>
        ))
      )}
    </select>
  </div>
  );
};

interface InputFieldProps {
  label: string;
  value: string | number;
  onChange: (val: string) => void;
  subLabel?: string;
  disabled?: boolean;
  type?: string;
}

const InputField = ({ label, value, onChange, subLabel, disabled, type = 'text' }: InputFieldProps) => {
  const fieldId = fieldIdFromLabel(label);
  return (
  <div className="w-full text-left">
    <label htmlFor={fieldId} className={`block text-gray-600 text-[15px] font-bold mb-1.5 ${disabled ? 'opacity-60' : ''}`}>{label}</label>
    <input
      id={fieldId}
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`w-full p-2.5 border border-gray-400 rounded-md bg-white text-gray-900 font-medium outline-none transition-shadow ${
        disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'focus:ring-2 focus:ring-[#2c3e76]/10'
      }`}
    />
    {subLabel && <p className={`text-[11px] text-gray-600 mt-1 font-medium ${disabled ? 'opacity-60' : ''}`}>{subLabel}</p>}
  </div>
  );
};

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  disabled?: boolean;
  placeholder?: string;
}

const SelectField = ({ label, value, onChange, options, disabled, placeholder = 'Select' }: SelectFieldProps) => {
  const fieldId = fieldIdFromLabel(label);
  return (
  <div className="w-full text-left">
    <label htmlFor={fieldId} className={`block text-gray-600 text-[15px] font-bold mb-1.5 ${disabled ? 'opacity-60' : ''}`}>{label}</label>
    <select
      id={fieldId}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={selectClass(!!disabled)}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
  );
};

interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

const TextAreaField = ({ label, value, onChange, disabled }: TextAreaFieldProps) => {
  const fieldId = fieldIdFromLabel(label);
  return (
  <div className="w-full text-left">
    <label htmlFor={fieldId} className={`block text-gray-600 text-[15px] font-bold mb-1.5 ${disabled ? 'opacity-60' : ''}`}>{label}</label>
    <textarea
      id={fieldId}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      rows={3}
      className={`w-full p-2.5 border border-gray-400 rounded-md bg-white text-gray-900 font-medium outline-none transition-shadow resize-y ${
        disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'focus:ring-2 focus:ring-[#2c3e76]/10'
      }`}
    />
  </div>
  );
};

export default EditOwnerForm;
