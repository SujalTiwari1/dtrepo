const BRANCH_MAP = {
  '101': 'Information Technology (IT)',
  '102': 'Computer Engineering (CMPN)',
  '104': 'Electronics & Telecommunication (EXTC)',
  '108': 'Electronics & Computer Science (EXCS)',
};

// New helper function to extract and format the username
const extractUsernameFromEmail = (email) => {
  if (!email || !email.includes('@')) return 'N/A';
  
  // Get the part before the '@' symbol
  const localPart = email.split('@')[0];
  
  // Split by the dot
  const nameParts = localPart.split('.');
  if (nameParts.length < 2) return 'N/A';

  const firstName = nameParts[0];
  // Get the second part and remove any numbers from it
  const lastName = nameParts[1].replace(/[0-9]/g, '');

  // Capitalize the first letter of each name
  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  return `${capitalize(firstName)} ${capitalize(lastName)}`;
};

// The main function now accepts 'email' as a second argument
export const decodeRollNumber = (rollNumber, email) => {
  if (!rollNumber || rollNumber.length !== 10) {
    return { error: "Invalid Roll Number format." };
  }

  const admissionYearShort = parseInt(rollNumber.substring(0, 2), 10);
  const branchCode = rollNumber.substring(2, 5);
  const division = rollNumber.substring(5, 6);
  const specificRollNo = rollNumber.substring(6);

  const admissionYear = 2000 + admissionYearShort;
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12

  let academicYear = currentYear - admissionYear;
  if (currentMonth < 7) {
    academicYear = currentYear - admissionYear - 1;
  }
  academicYear += 1;

  let semester = null;
  if (currentMonth >= 7 && currentMonth <= 12) {
    semester = academicYear * 2 - 1;
  } else if (currentMonth >= 1 && currentMonth <= 4) {
    semester = academicYear * 2;
  } else {
    semester = 'Vacation';
  }

  return {
    username: extractUsernameFromEmail(email), // The new username field
    admissionYear,
    branch: BRANCH_MAP[branchCode] || 'Unknown Branch',
    division,
    specificRollNo,
    currentAcademicYear: academicYear > 4 ? 'Graduated' : academicYear,
    currentSemester: semester,
  };
};