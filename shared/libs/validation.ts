// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const validateParameterNumber = (value: any, required = true) => {
  if (!required && (value === 'null' || value === undefined)) {
    return undefined;
  }

  let invalid = false;

  invalid = (
    !value
    || isNaN(+value)
    || +value <= 0
  );

  if (invalid) {
    return false;
  }

  return +value;
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const validateParameterArrayOfNumber = (value: any, required = true) => {
  if (!required && (value === 'null' || value === undefined)) {
    return undefined;
  }

  let valid = false;

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return undefined;
    }

    valid = true;
    for (const item of value) {
      if (
        !item
        || isNaN(+item)
        || +item <= 0
      ) {
        valid = false;
        break;
      }
    }

    if (!valid) {
      return false;
    }

    return value.map(i => +i).sort((a, b) => a - b);
  }

  return valid;
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const validateParameterBoolean = (value: any, required = true) => {
  if (!required && (value === 'null' || value === undefined)) {
    return undefined;
  }

  let invalid = false;

  if (value === 'true') {
    value = true;
  } else if (value === 'false') {
    value = false;
  }

  invalid = (
    value !== true
    && value !== false
  );

  if (invalid) {
    return null;
  }

  return value;
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const validateParameterString = (value: any, required = true) => {
  if (!required && (value === 'null' || value === undefined || value === '')) {
    return undefined;
  }


  return value;
};


// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const validateParameterArrayOfString = (value: any, required = true) => {
  if (!required && (value === 'null' || value === undefined)) {
    return undefined;
  }

  let valid = false;

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return undefined;
    }

    valid = true;
    for (const item of value) {
      if (
        !item
        || typeof item !== 'string'
      ) {
        valid = false;
        break;
      }
    }

    if (!valid) {
      return false;
    }

    return value;
  }

  return valid;
};
