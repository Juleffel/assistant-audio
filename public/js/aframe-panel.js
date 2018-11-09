// The ConversationPanel module is designed to handle
// all display and behaviors of the conversation column of the app.
/* eslint no-unused-vars: "off" */
/* global Api: true, Common: true*/

var AframePanel = (function () {
  let settings = {
    objectsIds: {
      box: 'aframe-box',
      sphere: 'aframe-sphere',
      cylinder: 'aframe-cylinder',
      sky: 'aframe-sky',
      plane: 'aframe-plane',
    },
    frToEn: {
      cube: 'box',
      ciel: 'sky',
      cylindre: 'cylinder',
      sol: 'plane',
      'sphère': 'sphere',
      blanc: 'white',
      bleu: 'blue',
      gris: 'grey',
      jaune: 'yellow',
      noir: 'black',
      orange: 'orange',
      rouge: 'red',
      vert: 'green',
      violet: 'purple',
    },
    colors: {
      white: 'white',
      blue: '#4CC3D9',
      grey: '#ECECEC',
      yellow: '#FFC65D',
      black: '#333333',
      orange: 'orange',
      red: '#EF2D5E',
      green: '#7BC8A4',
      purple: 'purple',
    }
  };
  let objects = {};

  // Publicly accessible methods defined
  return {
    init,
  };

  // Initialize the module
  function init() {
    chatUpdateSetup();
    $.each(settings.objectsIds, (obj, id) => {
      objects[obj] = document.getElementById(id);
    });
  }

  // Set up callbacks on payload setters in Api module
  // This causes the displayMessage function to be called when messages are sent / received
  function chatUpdateSetup() {
    var currentResponsePayloadSetter = Api.setResponsePayload;
    Api.setResponsePayload = function (newPayloadStr) {
      currentResponsePayloadSetter.call(Api, newPayloadStr);
      receivedMessage(JSON.parse(newPayloadStr));
    };
  }

  function getObj(objNameFr) {
    return objects[settings.frToEn[objNameFr]];
  }
  function getCol(colNameFr) {
    return settings.colors[settings.frToEn[colNameFr]];
  }

  function getEntities(payload) {
    entities = {};
    payload.entities.forEach(entity => {
      switch (entity.entity) {
        case 'object':
          if (entity.value == 'tout') {
            entities[entity.entity] = 'all';
          } else {
            entities[entity.entity] = getObj(entity.value);
          }
          break;
        case 'color':
          entities[entity.entity] = getCol(entity.value);
          break;
        default:
          entities[entity.entity] = entity.value;
      }
    });
    return entities;
  }

  function applyObject(obj, fn) {
    if (obj == 'all') {
      $.each(objects, (objName, object) => {
        fn(object);
      });
    } else {
      fn(obj);
    }
  }

  function colorChange(entities) {
    if (entities.object && entities.color) {
      applyObject(entities.object, obj => obj.setAttribute('color', entities.color));
    } else {
      console.error("User didn't provide an object and a color for a color change.");
    }
  }

  function removeObject(entities) {
    if (entities.object) {
      applyObject(entities.object, obj => obj.setAttribute('visible', false));
    } else {
      console.error("User didn't provide an object for a object removal.");
    }
  }

  function addObject(entities) {
    if (entities.object) {
      applyObject(entities.object, obj => {
        if (entities.color) {
          obj.setAttribute('color', entities.color);
        }
        obj.setAttribute('visible', true);
      });
    } else {
      console.error("User didn't provide an object for a object removal.");
    }
  }

  // Function called when the Assistant respond to a text wich has been sent to it.
  function receivedMessage(payload) {
    console.log(payload);
    let entities = getEntities(payload);
    if (entities.object && entities.color) {
      addObject(entities);
    }
    switch (entities.action) {
      case 'changer':
        colorChange(entities);
        break;
      case 'ajouter':
        addObject(entities);
        break;
      case 'supprimer':
        removeObject(entities);
        break;
      case undefined:
        console.log('No action seen');
        break;
      default:
        console.error(`Action ${entities.action} not implemented yet`);
    };
  }
}());