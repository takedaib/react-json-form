import React from 'react';
import ReactDOM from 'react-dom';
import EditorState from './editorState';
import ReactJSONForm from './form';
import DataValidator from './dataValidation';


export function FormInstance(config) {
    this.containerId = config.containerId;
    this.dataInputId = config.dataInputId;

    this.schema = config.schema;
    this.data = config.data;
    this.errorMap = config.errorMap;
    this.fileHandler = config.fileHandler;
    this.fileHandlerArgs = config.fileHandlerArgs || {};
    this.readonly = config.readonly || false;

    this.eventListeners = null;

    this._dataSynced = false;

    this.addEventListener = function(event, listener) {
        if (this.eventListeners === null)
            this.eventListeners = {};

        if (!this.eventListeners.hasOwnProperty(event))
            this.eventListeners[event] = new Set();

        this.eventListeners[event].add(listener);
    };

    this.onChange = function(e) {
        this.data = e.data;

        if (!this._dataSynced) {
            // this is the first change event for syncing data
            this._dataSynced = true;
            return;
        }

        if (!this.eventListeners)
            return;

        if (!this.eventListeners.hasOwnProperty('change') || !this.eventListeners.change.size)
            return;

        this.eventListeners.change.forEach((cb) => cb(e));
    };
    this.onChange = this.onChange.bind(this);

    this.render = function() {
        try {
            ReactDOM.render(
                <FormContainer
                    schema={this.schema}
                    dataInputId={this.dataInputId}
                    data={this.data}
                    errorMap={this.errorMap}
                    fileHandler={this.fileHandler}
                    fileHandlerArgs={this.fileHandlerArgs}
                    onChange={this.onChange}
                    readonly={this.readonly}
                />,
                document.getElementById(this.containerId)
            );
        } catch (error) {
            ReactDOM.render(
                <ErrorReporter error={error} />,
                document.getElementById(this.containerId)
            );
        }
    };

    this.update = function(config) {
        this.schema = config.schema || this.schema;
        this.data = config.data || this.data;
        this.errorMap = config.errorMap || this.errorMap;

        this.render();
    };

    this.getSchema = function() {
        return this.schema;
    };

    this.getData = function() {
        return this.data;
    };

    this.validate = function() {
        let validator = new DataValidator(this.getSchema());
        return validator.validate(this.getData());
    };
}


const FORM_INSTANCES = {};

export function createForm(config) {
    let instance = new FormInstance(config);

    // save a reference to the instance
    FORM_INSTANCES[config.containerId] = instance;

    return instance;
}


export function getFormInstance(id) {
    return FORM_INSTANCES[id];
}


export class FormContainer extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            editorState: EditorState.create(props.schema, props.data),
        };

        this.prevEditorState = this.state.editorState;

        this.dataInput = document.getElementById(props.dataInputId);
    }

    componentDidMount() {
        this.props.onChange({data: this.state.editorState.getData()});
        this.populateDataInput(this.state.editorState.getData());
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.props.schema !== prevProps.schema) {
            let newSchema = this.props.schema;
            let newData = this.props.data !== prevProps.data ? this.props.data : this.state.editorState.getData();
            this.setState({
                editorState: EditorState.create(newSchema, newData)
            });

            return;
        }

        if (this.props.data !== prevProps.data) {
            this.setState({
                editorState: EditorState.update(this.state.editorState, this.props.data)
            });

            return;
        }

        if (this.state.editorState !== prevState.editorState)
            this.populateDataInput(this.state.editorState.getData());

        if (this.props.onChange && this.state.editorState !== prevState.editorState)
            this.props.onChange({
                schema: this.state.editorState.getSchema(),
                data: this.state.editorState.getData(),
                prevSchema: prevState.editorState.getSchema(),
                prevData: prevState.editorState.getData()
            });
    }

    populateDataInput = (data) => {
        this.dataInput.value = JSON.stringify(data);
    }

    handleChange = (editorState) => {
        this.setState({editorState: editorState});
    }

    render() {
        return (
            <ReactJSONForm
                editorState={this.state.editorState}
                onChange={this.handleChange}
                fileHandler={this.props.fileHandler}
                fileHandlerArgs={this.props.fileHandlerArgs}
                errorMap={this.props.errorMap}
                readonly={this.props.readonly}
            />
        );
    }
}


function ErrorReporter(props) {
    /* Component for displaying errors to the user related to schema */

    return (
        <div style={{color: '#f00'}}>
            <p>(!) {props.error.toString()}</p>
            <p>Check browser console for more details about the error.</p>
        </div>
    );
}
