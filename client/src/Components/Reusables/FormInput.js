import React, { useState } from 'react';

const FormInput = ({ value, handler, labl, id }) => {
    return (
        <div>
            <label htmlFor={id} >{labl}</label>
            <input id={id} value={value} onChange={handler} />
        </div>
    );
};

export default FormInput;