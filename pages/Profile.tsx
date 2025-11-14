import React, { useState } from 'react';

const Profile: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
      name: 'Alex Doe',
      email: 'alex.doe@example.com',
      dob: 'January 1, 1980',
      phone: '(555) 123-4567',
      address: '123 Health St, Wellness City',
      emergencyContact: {
          name: 'Jane Doe',
          relationship: 'Spouse',
          phone: '(555) 765-4321',
      },
  });
  const [formData, setFormData] = useState(profileData);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEmergencyContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({
          ...prev,
          emergencyContact: {
              ...prev.emergencyContact,
              [name]: value,
          },
      }));
  };

  const handleEdit = () => {
      setFormData(profileData); // Reset form data to current profile data
      setIsEditing(true);
  };

  const handleCancel = () => {
      setIsEditing(false);
  };

  const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      setProfileData(formData);
      setIsEditing(false);
  };

  const inputClasses = "mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500";
  const infoLabelClasses = "font-medium text-slate-800";
  const infoValueClasses = "text-slate-700";

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
        <div>
            <h1 className="text-3xl font-bold text-slate-900">Profile & Settings</h1>
            <p className="mt-1 text-slate-500">Manage your personal information and preferences.</p>
        </div>

        <form onSubmit={handleSave} className="bg-white rounded-xl shadow-lg p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
                <img 
                    className="h-24 w-24 rounded-full object-cover" 
                    src="https://picsum.photos/200" 
                    alt="Profile" 
                />
                <div className="text-center md:text-left flex-grow">
                    {isEditing ? (
                        <input type="text" name="name" value={formData.name} onChange={handleInputChange} className={`${inputClasses} text-2xl font-bold`} />
                    ) : (
                        <h2 className="text-2xl font-bold text-slate-800">{profileData.name}</h2>
                    )}
                    {isEditing ? (
                         <input type="email" name="email" value={formData.email} onChange={handleInputChange} className={`${inputClasses} mt-2`} />
                    ) : (
                        <p className="text-slate-500">{profileData.email}</p>
                    )}
                </div>
                 <div className="flex gap-2">
                    {isEditing ? (
                        <>
                            <button type="submit" className="bg-sky-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-sky-700 transition-colors">
                                Save
                            </button>
                             <button type="button" onClick={handleCancel} className="bg-slate-100 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-200 transition-colors">
                                Cancel
                            </button>
                        </>
                    ) : (
                         <button type="button" onClick={handleEdit} className="bg-slate-100 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-200 transition-colors">
                            Edit Profile
                        </button>
                    )}
                </div>
            </div>
            
            <div className="mt-8 pt-8 border-t border-slate-200 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <h3 className="font-semibold text-slate-600">Personal Information</h3>
                    <div className="md:col-span-2 space-y-3 text-slate-800">
                        <div>
                            <span className={infoLabelClasses}>Date of Birth: </span>
                            {isEditing ? <input type="text" name="dob" value={formData.dob} onChange={handleInputChange} className={`${inputClasses} inline-block w-auto`} /> : <span className={infoValueClasses}>{profileData.dob}</span>}
                        </div>
                         <div>
                            <span className={infoLabelClasses}>Phone: </span>
                            {isEditing ? <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className={`${inputClasses} inline-block w-auto`} /> : <span className={infoValueClasses}>{profileData.phone}</span>}
                        </div>
                        <div>
                            <span className={infoLabelClasses}>Address: </span>
                             {isEditing ? <input type="text" name="address" value={formData.address} onChange={handleInputChange} className={inputClasses} /> : <span className={infoValueClasses}>{profileData.address}</span>}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <h3 className="font-semibold text-slate-600">Emergency Contact</h3>
                    <div className="md:col-span-2 space-y-3 text-slate-800">
                         <div>
                            <span className={infoLabelClasses}>Name: </span>
                             {isEditing ? <input type="text" name="name" value={formData.emergencyContact.name} onChange={handleEmergencyContactChange} className={`${inputClasses} inline-block w-auto`} /> : <span className={infoValueClasses}>{profileData.emergencyContact.name}</span>}
                        </div>
                        <div>
                            <span className={infoLabelClasses}>Relationship: </span>
                            {isEditing ? <input type="text" name="relationship" value={formData.emergencyContact.relationship} onChange={handleEmergencyContactChange} className={`${inputClasses} inline-block w-auto`} /> : <span className={infoValueClasses}>{profileData.emergencyContact.relationship}</span>}
                        </div>
                        <div>
                            <span className={infoLabelClasses}>Phone: </span>
                            {isEditing ? <input type="tel" name="phone" value={formData.emergencyContact.phone} onChange={handleEmergencyContactChange} className={`${inputClasses} inline-block w-auto`} /> : <span className={infoValueClasses}>{profileData.emergencyContact.phone}</span>}
                        </div>
                    </div>
                </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                    <h3 className="font-semibold text-slate-600">Notifications</h3>
                    <div className="md:col-span-2 flex items-center justify-between">
                       <p className="text-slate-800">Email Notifications</p>
                       <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" value="" className="sr-only peer" defaultChecked />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                       </label>
                    </div>
                </div>
            </div>
        </form>
    </div>
  );
};

export default Profile;