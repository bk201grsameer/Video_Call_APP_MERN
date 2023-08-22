import React from 'react';

const ButtonFunction = ({ name, handler }) => {
    return (
        <button onClick={handler}>
            {name}
        </button>
    );
};

export default ButtonFunction;